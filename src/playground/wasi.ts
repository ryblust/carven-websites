import {
  WASI,
  File,
  Directory,
  OpenFile,
  OpenDirectory,
  PreopenDirectory,
  ConsoleStdout,
  wasi as wasiDefinitions,
  type Inode,
} from '@bjorn3/browser_wasi_shim';
import type { Action, ExecutionResult, Version } from './protocol';

export const expectedCompilerRevision = '6d477cd14863f3d394196afde02b0dd9493a618e';
export const maxSourceBytes = 64 * 1024;
export const maxOutputBytes = 128 * 1024;
const maxWasmBytes = 128 * 1024 * 1024;
const maxCraftsBytes = 8 * 1024 * 1024;

export interface AssetDescriptor {
  path: string;
  sha256: string;
  bytes: number;
}
export interface CompilerManifest {
  formatter: 'graver';
  compilerRevision: string;
  wasm: AssetDescriptor;
  crafts: AssetDescriptor;
  supportedLibraries: string[];
}
export interface CompilerAssets {
  module: WebAssembly.Module;
  files: Record<string, string>;
  version: Version;
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseManifest(value: unknown): CompilerManifest {
  if (
    !record(value) ||
    value.compilerRevision !== expectedCompilerRevision ||
    value.formatter !== 'graver' ||
    !Array.isArray(value.supportedLibraries) ||
    !value.supportedLibraries.every((library) => typeof library === 'string')
  ) {
    throw new Error('Compiler asset manifest is invalid or targets another revision.');
  }
  const asset = (entry: unknown, path: string, maxBytes: number): AssetDescriptor => {
    if (
      !record(entry) ||
      entry.path !== path ||
      typeof entry.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      typeof entry.bytes !== 'number' ||
      !Number.isInteger(entry.bytes) ||
      entry.bytes <= 0 ||
      entry.bytes > maxBytes
    ) {
      throw new Error('Compiler asset descriptor is invalid.');
    }
    return { path, sha256: entry.sha256, bytes: entry.bytes };
  };
  return {
    formatter: 'graver',
    compilerRevision: expectedCompilerRevision,
    wasm: asset(value.wasm, 'carven.wasm', maxWasmBytes),
    crafts: asset(value.crafts, 'crafts.json', maxCraftsBytes),
    supportedLibraries: value.supportedLibraries as string[],
  };
}

export function parseCrafts(value: unknown): Record<string, string> {
  if (!record(value) || !record(value.files)) throw new Error('Crafts package is invalid.');
  const files: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [path, content] of Object.entries(value.files)) {
    if (
      !/^crafts\/carven\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(?:cv|hpp)$/.test(path) ||
      typeof content !== 'string'
    ) {
      throw new Error('Crafts package contains an invalid file.');
    }
    files[path] = content;
  }
  if (!('crafts/carven/runtime/runtime.hpp' in files)) {
    throw new Error('Crafts package has no runtime discovery header.');
  }
  return files;
}

async function boundedDownload(url: URL, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(url, { credentials: 'omit', redirect: 'error' });
  if (!response.ok || !response.body) throw new Error('Could not load compiler assets.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) throw new Error('Compiler asset exceeds its declared size.');
      chunks.push(chunk.value);
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export async function verifiedDownload(
  base: URL,
  descriptor: AssetDescriptor,
): Promise<Uint8Array<ArrayBuffer>> {
  const bytes = await boundedDownload(new URL(descriptor.path, base), descriptor.bytes);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  if (bytes.byteLength !== descriptor.bytes || hash !== descriptor.sha256) {
    throw new Error('Compiler asset integrity verification failed.');
  }
  return bytes;
}

export async function loadCompilerAssets(base: URL): Promise<CompilerAssets> {
  const manifest = parseManifest(
    JSON.parse(
      new TextDecoder().decode(await boundedDownload(new URL('manifest.json', base), 16 * 1024)),
    ),
  );
  const [wasm, crafts] = await Promise.all([
    verifiedDownload(base, manifest.wasm),
    verifiedDownload(base, manifest.crafts),
  ]);
  const module = await WebAssembly.compile(wasm);
  // The compiler gets WASI capabilities only; it cannot call browser/network APIs.
  if (
    WebAssembly.Module.imports(module).some((entry) => entry.module !== 'wasi_snapshot_preview1')
  ) {
    throw new Error('Compiler module imports unsupported host capabilities.');
  }
  return {
    module,
    files: parseCrafts(JSON.parse(new TextDecoder().decode(crafts))),
    version: {
      compilerRevision: manifest.compilerRevision,
      backend: 'browser-wasi',
      revisionVerified: true,
      supportedLibraries: manifest.supportedLibraries,
    },
  };
}

export function validateInput(
  source: unknown,
  action: unknown,
): { source: string; action: Action } {
  if (
    typeof source !== 'string' ||
    source.includes('\0') ||
    new TextEncoder().encode(source).byteLength > maxSourceBytes
  ) {
    throw new Error('Source must be a UTF-8 string of at most 64 KiB without NUL characters.');
  }
  if (action !== 'run' && action !== 'check' && action !== 'compile' && action !== 'format')
    throw new Error('Unknown compiler action.');
  return { source, action };
}

class OutputLimit extends Error {}

/** Raw byte sinks preserve partial lines and UTF-8 writes without an unbounded line buffer. */
export class CapturedOutput {
  private readonly stdout: Uint8Array[] = [];
  private readonly stderr: Uint8Array[] = [];
  private bytes = 0;
  truncated = false;
  private readonly limit: number;
  constructor(limit = maxOutputBytes) {
    this.limit = limit;
  }

  fd(stream: 'stdout' | 'stderr') {
    return new ConsoleStdout((data) => {
      const remaining = this.limit - this.bytes;
      if (remaining > 0) this[stream].push(data.slice(0, remaining));
      this.bytes += Math.min(data.byteLength, remaining);
      if (data.byteLength > remaining) {
        this.truncated = true;
        throw new OutputLimit('Output limit reached.');
      }
    });
  }
  text(stream: 'stdout' | 'stderr') {
    const decoder = new TextDecoder();
    return (
      this[stream].map((chunk) => decoder.decode(chunk, { stream: true })).join('') +
      decoder.decode()
    );
  }
}

function filesystem(source: string, files: Record<string, string>) {
  const root = new Directory(new Map<string, Inode>());
  const insert = (path: string, content: string) => {
    const parts = path.split('/');
    let directory = root;
    for (const part of parts.slice(0, -1)) {
      let child = directory.contents.get(part);
      if (!child) {
        child = new Directory(new Map());
        directory.contents.set(part, child);
      }
      if (!(child instanceof Directory)) throw new Error('Conflicting virtual file path.');
      directory = child;
    }
    directory.contents.set(
      parts.at(-1)!,
      new File(new TextEncoder().encode(content), { readonly: true }),
    );
  };
  for (const [path, content] of Object.entries(files)) insert(path, content);
  insert('bin/carven', '');
  insert('main.cv', source);
  root.contents.set('generated', new Directory(new Map()));
  // Construct the finished hierarchy bottom-up so the shim sets parent inodes.
  const finalize = (directory: Directory): Directory =>
    new Directory(
      [...directory.contents].map(([name, child]) => [
        name,
        child instanceof Directory ? finalize(child) : child,
      ]),
    );
  return new PreopenDirectory('/', finalize(root).contents);
}

function generatedArtifacts(root: PreopenDirectory): ExecutionResult['artifacts'] {
  const artifacts: ExecutionResult['artifacts'] = [];
  const collect = (directory: Directory, prefix: string) => {
    for (const [name, entry] of [...directory.contents].sort(([a], [b]) => a.localeCompare(b))) {
      const path = `${prefix}${name}`;
      if (entry instanceof Directory) collect(entry, `${path}/`);
      else if (entry instanceof File)
        artifacts.push({ path, content: new TextDecoder().decode(entry.data) });
    }
  };
  const generated = root.dir.contents.get('generated');
  if (generated instanceof Directory) collect(generated, '');
  return artifacts;
}

export async function executeWasi(
  assets: CompilerAssets,
  source: string,
  action: Action,
  outputLimit = maxOutputBytes,
): Promise<ExecutionResult> {
  validateInput(source, action);
  const started = performance.now();
  const output = new CapturedOutput(
    action === 'format' ? Math.min(outputLimit, maxSourceBytes) : outputLimit,
  );
  const args =
    action === 'run'
      ? ['carven', 'interpret', '--max-steps', '100000', 'main.cv']
      : action === 'compile'
        ? ['carven', 'compile', '-o', 'generated', 'main.cv']
        : ['carven', action, 'main.cv'];
  const root = filesystem(source, assets.files);
  const wasi = new WASI(
    args,
    ['PWD=/', 'LANG=C.UTF-8', 'NO_COLOR=1', 'TERM=dumb'],
    [new OpenFile(new File([])), output.fd('stdout'), output.fd('stderr'), root],
    { debug: false },
  );
  // The shim's default readlink returns ENOTSUP, which breaks libc canonical().
  // Our packaged filesystem contains only regular files and directories, so
  // existing paths are correctly reported as EINVAL (not a symbolic link).
  wasi.wasiImport.path_readlink = (fd: number, pathPointer: number, pathLength: number) => {
    const directory = wasi.fds[fd];
    if (!(directory instanceof OpenDirectory)) return wasiDefinitions.ERRNO_BADF;
    const path = new TextDecoder().decode(
      new Uint8Array(wasi.inst.exports.memory.buffer, pathPointer, pathLength),
    );
    const status = directory.path_filestat_get(0, path);
    return status.ret === 0 ? wasiDefinitions.ERRNO_INVAL : status.ret;
  };
  const write = wasi.wasiImport.fd_write!;
  let artifactBytes = 0;
  wasi.wasiImport.fd_write = (fd: number, vectors: number, count: number, written: number) => {
    const file = wasi.fds[fd];
    if (file instanceof OpenFile && !file.file.readonly) {
      const memory = new DataView(wasi.inst.exports.memory.buffer);
      let size = 0;
      for (let index = 0; index < count; index++)
        size += memory.getUint32(vectors + index * 8 + 4, true);
      if (artifactBytes + size > maxOutputBytes) {
        output.truncated = true;
        throw new OutputLimit('Generated artifact limit reached.');
      }
      artifactBytes += size;
    }
    return write(fd, vectors, count, written);
  };
  const instance = await WebAssembly.instantiate(assets.module, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });
  const memory = instance.exports.memory;
  const start = instance.exports._start;
  if (!(memory instanceof WebAssembly.Memory) || typeof start !== 'function') {
    throw new Error('Compiler module has no WASI command entry.');
  }
  let exitCode: number;
  try {
    exitCode = wasi.start({ exports: { memory, _start: start as () => unknown } });
  } catch (error) {
    if (error instanceof OutputLimit) exitCode = 125;
    else {
      exitCode = 137;
      // Preserve compiler diagnostics if the module subsequently traps.
      try {
        output
          .fd('stderr')
          .fd_write(new TextEncoder().encode('\nCompiler execution stopped unexpectedly.\n'));
      } catch (failure) {
        if (!(failure instanceof OutputLimit)) throw failure;
      }
    }
  }
  const stdout = output.text('stdout');
  return {
    stdout,
    stderr: output.text('stderr'),
    exitCode,
    artifacts: action === 'compile' && exitCode === 0 ? generatedArtifacts(root) : [],
    ...(action === 'format' && exitCode === 0 && !output.truncated
      ? { formattedSource: stdout }
      : {}),
    version: assets.version,
    durationMs: Math.round(performance.now() - started),
    truncated: output.truncated,
    timedOut: false,
  };
}
