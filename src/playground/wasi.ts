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
import type { Action, ExecutionInput, ExecutionResult } from './protocol';

export const maxSourceBytes = 64 * 1024;
export const maxOutputBytes = 128 * 1024;
const maxWasmBytes = 128 * 1024 * 1024;
const maxCraftsBytes = 8 * 1024 * 1024;
export { validFilePath, validateExecutionInput } from './workspace.ts';
import { validateExecutionInput } from './workspace.ts';
export interface CompilerAssets {
  module: WebAssembly.Module;
  files: Record<string, string>;
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseCrafts(value: unknown): Record<string, string> {
  if (!record(value) || !record(value.files)) throw new Error('Crafts package is invalid.');
  const files: Record<string, string> = Object.create(null) as Record<string, string>;

  for (const [path, content] of Object.entries(value.files)) {
    if (
      !/^crafts\/carven\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.cv$/.test(path) ||
      typeof content !== 'string'
    ) {
      throw new Error('Crafts package contains an invalid file.');
    }

    files[path] = content;
  }

  if (Object.keys(files).length === 0) {
    throw new Error('Crafts package has no sources.');
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
      if (size > limit) throw new Error('Compiler asset exceeds its download budget.');
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

export async function loadCompilerAssets(base: URL): Promise<CompilerAssets> {
  const asset = (name: string) => {
    const url = new URL(name, base);
    const revision = import.meta.env?.COMPILER_REVISION;
    if (revision) url.searchParams.set('v', revision);
    return url;
  };
  const [wasm, crafts] = await Promise.all([
    boundedDownload(asset('carven.wasm'), maxWasmBytes),
    boundedDownload(asset('crafts.json'), maxCraftsBytes),
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
  if (
    action !== 'run' &&
    action !== 'test' &&
    action !== 'check' &&
    action !== 'compile' &&
    action !== 'format' &&
    action !== 'ast' &&
    action !== 'tokens' &&
    action !== 'call'
  )
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

function filesystem(source: string, files: Record<string, string>, input: ExecutionInput) {
  const root = new Directory(new Map<string, Inode>());

  const insert = (path: string, content: string, readonly = true) => {
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
      new File(new TextEncoder().encode(content), { readonly }),
    );
  };

  for (const [path, content] of Object.entries(files)) insert(path, content);
  insert('bin/carven', '');
  for (const [path, content] of Object.entries(input.files ?? {}))
    insert(path, content, path.endsWith('.cv'));
  insert(input.entry ?? 'main.cv', source);
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

function outputFiles(root: PreopenDirectory, input: ExecutionInput): ExecutionResult['artifacts'] {
  const files: ExecutionResult['artifacts'] = [];
  const collect = (directory: Directory, prefix: string) => {
    for (const [name, entry] of [...directory.contents].sort(([a], [b]) => a.localeCompare(b))) {
      const path = `${prefix}${name}`;
      if (!prefix && ['crafts', 'bin', 'generated'].includes(name)) continue;
      if (entry instanceof Directory) collect(entry, `${path}/`);
      else if (entry instanceof File && !entry.readonly) {
        const content = new TextDecoder().decode(entry.data);
        if (input.files?.[path] !== content) files.push({ path, content });
      }
    }
  };
  collect(root.dir, '');
  return files;
}

async function createRuntime(assets: CompilerAssets) {
  let output = new CapturedOutput();
  let input = validateExecutionInput();
  let root = filesystem('', assets.files, input);
  let stdin = new OpenFile(new File([]));
  const wasi = new WASI(
    [],
    ['PWD=/', 'LANG=C.UTF-8', 'NO_COLOR=1', 'TERM=dumb'],
    [stdin, output.fd('stdout'), output.fd('stderr'), root],
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
  // The shim handles clock polling only. Make the supplied input immediately
  // readable, then report EOF after its last byte.
  const poll = wasi.wasiImport.poll_oneoff!;
  wasi.wasiImport.poll_oneoff = (
    subscriptions: number,
    events: number,
    count: number,
    completed?: number,
  ) => {
    const memory = new DataView(wasi.inst.exports.memory.buffer);

    for (let index = 0; index < count; index++) {
      const subscription = subscriptions + index * 48;
      if (
        memory.getUint8(subscription + 8) === wasiDefinitions.EVENTTYPE_FD_READ &&
        memory.getUint32(subscription + 16, true) === 0
      ) {
        new wasiDefinitions.Event(
          memory.getBigUint64(subscription, true),
          wasiDefinitions.ERRNO_SUCCESS,
          wasiDefinitions.EVENTTYPE_FD_READ,
        ).write_bytes(memory, events);
        const remaining = Math.max(0, stdin.file.data.byteLength - Number(stdin.file_pos));
        memory.setBigUint64(events + 16, BigInt(remaining), true);
        memory.setUint16(
          events + 24,
          remaining === 0 ? wasiDefinitions.EVENTRWFLAGS_FD_READWRITE_HANGUP : 0,
          true,
        );
        if (completed !== undefined) memory.setUint32(completed, 1, true);

        return wasiDefinitions.ERRNO_SUCCESS;
      }
    }

    const result = poll(subscriptions, events, count);
    if (result === wasiDefinitions.ERRNO_SUCCESS && completed !== undefined)
      memory.setUint32(completed, 1, true);

    return result;
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
  const execute = instance.exports.carven_execute;
  if (!(memory instanceof WebAssembly.Memory) || typeof execute !== 'function') {
    throw new Error('Compiler module has no browser reactor entry.');
  }
  wasi.initialize({ exports: { memory, _initialize: instance.exports._initialize as () => void } });
  let usable = true;
  return {
    install(source: string, workspace: ExecutionInput) {
      input = workspace;
      root = filesystem(source, assets.files, workspace);
      stdin = new OpenFile(new File(new TextEncoder().encode(workspace.stdin)));
      wasi.fds[0] = stdin;
      wasi.fds[3] = root;
    },
    execute(args: string[], action: Action, outputLimit = maxOutputBytes): ExecutionResult {
      const started = performance.now();
      output = new CapturedOutput(
        action === 'format' ? Math.min(outputLimit, maxSourceBytes) : outputLimit,
      );
      artifactBytes = 0;
      wasi.fds[1] = output.fd('stdout');
      wasi.fds[2] = output.fd('stderr');
      root.dir.contents.set('generated', new Directory(new Map()));
      root.dir.contents.set(
        '.playground-command',
        new File(new TextEncoder().encode(args.join('\n')), { readonly: true }),
      );
      let exitCode: number;
      try {
        exitCode = execute() as number;
      } catch (error) {
        // A JS trap bypasses C++ unwinding, so never reenter this instance.
        usable = false;
        if (error instanceof OutputLimit) exitCode = 125;
        else {
          exitCode = 137;
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
        artifacts:
          exitCode === 0
            ? action === 'compile' || action === 'call'
              ? generatedArtifacts(root)
              : outputFiles(root, input)
            : [],
        durationMs: Math.round(performance.now() - started),
        truncated: output.truncated,
        ...(action === 'format' && exitCode === 0 && !output.truncated
          ? { formattedSource: stdout }
          : {}),
      };
    },
    close() {
      if (usable) (instance.exports.carven_close as () => void)();
      usable = false;
    },
  };
}

function validatedWorkspace(source: string, action: Action, workspace: ExecutionInput) {
  validateInput(source, action);
  const input = validateExecutionInput(workspace);
  const files = { ...input.files, [input.entry!]: source };
  validateExecutionInput({ ...input, files });
  return { ...input, files };
}

export class WasiHostingSession {
  private readonly assets: CompilerAssets;
  private runtime?: Awaited<ReturnType<typeof createRuntime>>;
  private sourceKey?: string;
  private revision = 0;
  private rejected?: { key: string; diagnostics: string };
  private entry?: string;

  constructor(assets: CompilerAssets) {
    this.assets = assets;
  }

  async run(
    source: string,
    workspace: ExecutionInput,
    outputLimit = maxOutputBytes,
  ): Promise<ExecutionResult> {
    const input = validatedWorkspace(source, 'call', workspace);
    if (!input.call) throw new Error('Function call is missing.');
    if (this.entry && this.entry !== input.entry) this.close();
    this.entry = input.entry;
    this.runtime ??= await createRuntime(this.assets);
    this.runtime.install(source, input);
    const files = Object.entries(input.files)
      .filter(([path]) => path.endsWith('.cv'))
      .sort(([a], [b]) => a.localeCompare(b));
    const key = JSON.stringify([input.entry, input.call.name, files]);
    let status: NonNullable<ExecutionResult['hosting']>['status'] = 'unchanged';
    let diagnostics = '';
    let update: ExecutionResult | undefined;
    if (key !== this.sourceKey) {
      if (this.rejected?.key === key) {
        diagnostics = this.rejected.diagnostics;
      } else {
        update = this.runtime.execute(
          ['host', 'update', input.entry!, input.call.name, ...files.map(([path]) => path)],
          'call',
          outputLimit,
        );
        if (update.exitCode === 0) {
          status = this.revision ? 'reloaded' : 'loaded';
          this.sourceKey = key;
          this.revision += 1;
          this.rejected = undefined;
        } else {
          diagnostics = update.stderr;
          this.rejected = { key, diagnostics };
          if (update.truncated || update.exitCode === 137) {
            this.close();
            return update;
          }
        }
      }
      if (diagnostics) status = this.revision ? 'retained' : 'unavailable';
    }
    if (!this.revision) {
      return {
        stdout: update?.stdout ?? '',
        stderr: '',
        exitCode: 1,
        artifacts: [],
        durationMs: update?.durationMs ?? 0,
        truncated: false,
        hosting: { status: 'unavailable', revision: 0, diagnostics },
      };
    }
    const result = this.runtime.execute(
      ['host', 'call', input.call.name, ...input.call.arguments.map(String)],
      'call',
      outputLimit,
    );
    const combined = {
      ...result,
      stdout: (update?.stdout ?? '') + result.stdout,
      durationMs: (update?.durationMs ?? 0) + result.durationMs,
      hosting: { status, revision: this.revision, diagnostics },
    };
    if (result.truncated || result.exitCode === 137) this.close();
    return combined;
  }

  close() {
    try {
      this.runtime?.close();
    } finally {
      this.runtime = undefined;
      this.sourceKey = undefined;
      this.rejected = undefined;
      this.revision = 0;
      this.entry = undefined;
    }
  }
}

export async function executeWasi(
  assets: CompilerAssets,
  source: string,
  action: Action,
  outputLimit = maxOutputBytes,
  workspace: ExecutionInput = {},
): Promise<ExecutionResult> {
  const input = validatedWorkspace(source, action, workspace);
  if (action === 'call') {
    const hosting = new WasiHostingSession(assets);
    try {
      return await hosting.run(source, input, outputLimit);
    } finally {
      hosting.close();
    }
  }
  const entry = input.entry!;
  const roots = [
    entry,
    ...Object.keys(input.files).filter((path) => path.endsWith('.cv') && path !== entry),
  ];
  const args =
    action === 'run'
      ? ['interpret', '--max-steps', '100000', entry]
      : action === 'test'
        ? ['interpret', '--tests', '--max-steps', '100000', ...roots]
        : action === 'compile'
          ? ['compile', '--no-query', '-o', 'generated', ...roots]
          : action === 'ast' || action === 'tokens'
            ? ['dump', action, entry]
            : [action, ...(action === 'format' ? [entry] : roots)];
  const runtime = await createRuntime(assets);
  try {
    runtime.install(source, input);
    return runtime.execute(args, action, outputLimit);
  } finally {
    runtime.close();
  }
}
