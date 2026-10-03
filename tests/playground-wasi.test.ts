import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { playgroundExamples } from '../src/playground/examples';
import {
  CapturedOutput,
  executeWasi,
  expectedCompilerRevision,
  maxSourceBytes,
  parseCrafts,
  parseManifest,
  validateInput,
  verifiedDownload,
  type CompilerAssets,
} from '../src/playground/wasi';

const manifest = {
  compilerRevision: expectedCompilerRevision,
  wasm: { path: 'carven.wasm', sha256: 'a'.repeat(64), bytes: 1024 },
  crafts: { path: 'crafts.json', sha256: 'b'.repeat(64), bytes: 512 },
  supportedLibraries: ['Carven standard library'],
};

describe('browser compiler input boundary', () => {
  it('preserves Unicode and exact source bytes for accepted commands', () => {
    const source = '\nentry task() { println("你好"); }\n';
    for (const action of ['run', 'check', 'compile'] as const) {
      expect(validateInput(source, action)).toEqual({ source, action });
    }
  });

  it('rejects extra commands, NUL input, and sources beyond the UTF-8 byte budget', () => {
    expect(() => validateInput('', 'shell')).toThrow('Unknown compiler action');
    expect(() => validateInput('\0', 'run')).toThrow('without NUL');
    expect(() => validateInput('界'.repeat(Math.ceil(maxSourceBytes / 3)), 'run')).toThrow(
      '64 KiB',
    );
    expect(validateInput('x'.repeat(maxSourceBytes), 'check').source.length).toBe(maxSourceBytes);
  });
});

describe('browser compiler asset boundary', () => {
  it('accepts the pinned revision and rejects different revisions or alternate asset URLs', () => {
    expect(parseManifest(manifest)).toEqual(manifest);
    expect(() => parseManifest({ ...manifest, compilerRevision: '0'.repeat(40) })).toThrow(
      'another revision',
    );
    expect(() =>
      parseManifest({
        ...manifest,
        wasm: { ...manifest.wasm, path: 'https://elsewhere.test/compiler.wasm' },
      }),
    ).toThrow('descriptor');
  });

  it('limits packaged filesystem paths to Crafts and requires runtime discovery', () => {
    const files = {
      'crafts/carven/runtime/runtime.hpp': '',
      'crafts/carven/std/text.cv': 'task sample() {}',
    };
    expect(parseCrafts({ files })).toEqual(files);
    expect(() => parseCrafts({ files: { ...files, '../main.cv': 'anything' } })).toThrow(
      'invalid file',
    );
    expect(() => parseCrafts({ files: {} })).toThrow('runtime discovery');
  });

  it('verifies downloaded bytes against the packaged SHA-256', async () => {
    const bytes = new TextEncoder().encode('actual packaged source');
    const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const descriptor = { path: 'crafts.json', sha256, bytes: bytes.byteLength };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(bytes)),
    );
    try {
      expect(
        await verifiedDownload(
          new URL('https://example.test/prefix/playground-assets/'),
          descriptor,
        ),
      ).toEqual(bytes);
      await expect(
        verifiedDownload(new URL('https://example.test/'), {
          ...descriptor,
          sha256: '0'.repeat(64),
        }),
      ).rejects.toThrow('integrity');
      await expect(
        verifiedDownload(new URL('https://example.test/'), {
          ...descriptor,
          bytes: bytes.length - 1,
        }),
      ).rejects.toThrow('declared size');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('browser compiler output boundary', () => {
  it('preserves partial UTF-8 writes without requiring a newline', () => {
    const output = new CapturedOutput();
    const stdout = output.fd('stdout');
    const bytes = new TextEncoder().encode('你好');
    stdout.fd_write(bytes.subarray(0, 2));
    stdout.fd_write(bytes.subarray(2));
    expect(output.text('stdout')).toBe('你好');
    expect(output.truncated).toBe(false);
  });

  it('bounds stdout and stderr together and interrupts the producing module', () => {
    const output = new CapturedOutput(8);
    output.fd('stdout').fd_write(new TextEncoder().encode('12345'));
    expect(() => output.fd('stderr').fd_write(new TextEncoder().encode('abcdef'))).toThrow(
      'Output limit',
    );
    expect(output.text('stdout')).toBe('12345');
    expect(output.text('stderr')).toBe('abc');
    expect(output.truncated).toBe(true);
  });
});

describe('packaged Carven compiler through the browser WASI host', () => {
  let assets: CompilerAssets;
  beforeAll(async () => {
    const root = new URL('../public/playground-assets/', import.meta.url);
    const manifest = parseManifest(
      JSON.parse(await readFile(new URL('manifest.json', root), 'utf8')),
    );
    const [wasm, crafts] = await Promise.all([
      readFile(new URL(manifest.wasm.path, root)),
      readFile(new URL(manifest.crafts.path, root)),
    ]);
    for (const [bytes, descriptor] of [
      [wasm, manifest.wasm],
      [crafts, manifest.crafts],
    ] as const) {
      expect(bytes.length).toBe(descriptor.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(descriptor.sha256);
    }
    assets = {
      module: await WebAssembly.compile(wasm),
      files: parseCrafts(JSON.parse(crafts.toString('utf8'))),
      version: {
        compilerRevision: manifest.compilerRevision,
        backend: 'browser-wasi',
        revisionVerified: true,
        supportedLibraries: manifest.supportedLibraries,
      },
    };
  });

  const expected = {
    hello: 'Answer: 42\n',
    'structured-output':
      'Order {\n    id: 7,\n    status: Status::Shipped(\n        3,\n    ),\n    items: [\n        "disk",\n        "cable",\n    ],\n}\n',
    'typed-failures': 'ok 9000\nmissing 8080\nDenied: denied\nBad port: 9x00\n',
    'static-text': 'Commands:\n  build: Compile the project\n  run: Run the program\n\n',
    specialization: 'true false\n',
  };
  for (const example of playgroundExamples) {
    it(`executes the ${example.id} editor preset in a fresh in-memory filesystem`, async () => {
      const result = await executeWasi(assets, example.source, 'run');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe(expected[example.id]);
      expect(result.stderr).toBe('');
      expect(result.artifacts).toEqual([]);
      expect(result.truncated).toBe(false);
    });
  }

  it('checks accepted source without running its entry', async () => {
    const result = await executeWasi(assets, 'println("runtime only");', 'check');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('check passed');
  });

  it('returns actual generated C++ files separately from compile-time stdout', async () => {
    const result = await executeWasi(
      assets,
      'const test { println("==> fake.hpp <=="); }\nprintln("real");',
      'compile',
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('==> fake.hpp <==\n');
    expect(result.artifacts.some((file) => file.path === 'fake.hpp')).toBe(false);
    const main = result.artifacts.find((file) => file.path === 'main.cpp');
    expect(main?.content).toContain('real');
    expect(main?.content).toContain('#include');
  });

  it('reports compiler type errors and publishes no artifacts', async () => {
    const result = await executeWasi(
      assets,
      'let value: i32 = "oops";\nprintln(value);',
      'compile',
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('CV-TYPE-MISMATCH');
    expect(result.stderr).not.toContain('\u001b[');
    expect(result.stderr).toContain('main.cv:1:18');
    expect(result.artifacts).toEqual([]);
  });

  it('rejects native C++ calls at the interpreter admission boundary', async () => {
    const result = await executeWasi(
      assets,
      'import <cstdlib> using std::abort;\nfn main() { abort(); }',
      'run',
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('CV-INTERPRET-ADMISSION');
    expect(result.stdout).toBe('');
  });

  it('limits interpreted loops and preserves output before the limit', async () => {
    const result = await executeWasi(assets, 'println("start");\nwhile true {}', 'run');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('CV-INTERPRET-LIMIT');
    expect(result.stdout).toBe('start\n');
  });

  it('stops WASM execution when the host output budget is exceeded', async () => {
    const result = await executeWasi(assets, 'println("123456789");', 'run', 8);
    expect(result.exitCode).toBe(125);
    expect(result.stdout).toBe('12345678');
    expect(result.truncated).toBe(true);
  });
});
