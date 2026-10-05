import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { playgroundExamples } from '../src/playground/examples';
import {
  CapturedOutput,
  executeWasi,
  maxSourceBytes,
  parseCrafts,
  validateInput,
  loadCompilerAssets,
  type CompilerAssets,
} from '../src/playground/wasi';

const root = new URL('../public/playground-assets/', import.meta.url);

describe('browser compiler input boundary', () => {
  it('preserves Unicode and exact source bytes for accepted commands', () => {
    const source = '\nentry task() { println("你好"); }\n';
    for (const action of ['run', 'check', 'compile', 'format', 'ast', 'tokens'] as const) {
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

  it('loads the compiler and Crafts beneath the deployment prefix', async () => {
    const [wasm, crafts] = await Promise.all([
      readFile(new URL('carven.wasm', root)),
      readFile(new URL('crafts.json', root), 'utf8'),
    ]);
    const base = new URL('https://example.test/project/playground-assets/');
    const fetchAsset = vi.fn(async (url: URL) => {
      if (url.href === new URL('carven.wasm', base).href) return new Response(wasm);
      if (url.href === new URL('crafts.json', base).href) return new Response(crafts);
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchAsset);
    try {
      const assets = await loadCompilerAssets(base);
      expect(assets.module).toBeInstanceOf(WebAssembly.Module);
      expect(assets.files).toEqual(parseCrafts(JSON.parse(crafts)));
      expect(new Set(fetchAsset.mock.calls.map(([url]) => url.href))).toEqual(
        new Set([new URL('carven.wasm', base).href, new URL('crafts.json', base).href]),
      );
      await expect(loadCompilerAssets(new URL('https://example.test/missing/'))).rejects.toThrow(
        'Could not load compiler assets',
      );
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
    const [wasm, crafts] = await Promise.all([
      readFile(new URL('carven.wasm', root)),
      readFile(new URL('crafts.json', root)),
    ]);
    assets = {
      module: await WebAssembly.compile(wasm),
      files: parseCrafts(JSON.parse(crafts.toString('utf8'))),
    };
  });

  for (const example of playgroundExamples) {
    it(`executes the ${example.id} editor preset in a fresh in-memory filesystem`, async () => {
      const result = await executeWasi(assets, example.source, 'run');
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).not.toBe('');
      if (example.id === 'hello') expect(result.stdout).toBe('Answer: 42\n');
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

  it('dumps tokens without parsing or executing source', async () => {
    const result = await executeWasi(assets, 'let value = ;', 'tokens');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Let');
    expect(result.stdout).toContain('Semicolon');
    expect(result.stderr).toBe('');
    expect(result.artifacts).toEqual([]);
  });

  it('dumps syntax without resolving names or executing source', async () => {
    const result = await executeWasi(assets, 'println(missing);', 'ast');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('missing');
    expect(result.stdout).toContain('println');
    expect(result.stderr).toBe('');
    expect(result.artifacts).toEqual([]);
  });

  it('formats source with Graver while preserving comments, literals, and syntax-only names', async () => {
    const source = '// 保留注释\nlet   value=missing(  "你好  世界" ,2);\nprintln( value );';
    const result = await executeWasi(assets, source, 'format');
    expect(result.exitCode).toBe(0);
    expect(result.formattedSource).toBe(
      '// 保留注释\nlet value = missing("你好  世界", 2);\nprintln(value);\n',
    );
    expect(result.stderr).toBe('');
    expect(result.artifacts).toEqual([]);
  });

  it('returns no replacement source when Graver rejects malformed syntax', async () => {
    const result = await executeWasi(assets, 'let value = ;', 'format');
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('CV-SYNTAX');
    expect(result.formattedSource).toBeUndefined();
    expect(result.stdout).toBe('');
  });

  it('returns no replacement source when formatted output is truncated', async () => {
    const result = await executeWasi(assets, 'let   value=1;', 'format', 8);
    expect(result.exitCode).toBe(125);
    expect(result.truncated).toBe(true);
    expect(result.formattedSource).toBeUndefined();
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
