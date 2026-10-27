import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  executeWasi,
  parseCrafts,
  validateExecutionInput,
  type CompilerAssets,
  WasiHostingSession,
} from '../src/playground/wasi';
import { pricingSource, workspaceExamples } from '../src/playground/workspace-examples';
import { readQuote } from '../src/components/PlaygroundPreview';

let assets: CompilerAssets;
beforeAll(async () => {
  const root = new URL('../public/playground-assets/', import.meta.url);
  assets = {
    module: await WebAssembly.compile(await readFile(new URL('carven.wasm', root))),
    files: parseCrafts(JSON.parse(await readFile(new URL('crafts.json', root), 'utf8'))),
  };
});

describe('Playground workspaces and hosted calls', () => {
  it('calls a bare source function with typed arguments and returns a record', async () => {
    const call = async (price: number, percent: number) =>
      executeWasi(assets, pricingSource, 'call', undefined, {
        entry: 'pricing.cv',
        call: { name: 'quote', arguments: [price, percent] },
      });
    const first = await call(1200, 25);
    expect(first.stderr).toBe('');
    expect(first.exitCode).toBe(0);
    expect(readQuote(first)).toEqual({ subtotal: 1200, saved: 300, total: 900 });
    expect(readQuote(await call(2000, 50))).toEqual({ subtotal: 2000, saved: 1000, total: 1000 });
  });

  it('uses edited source, rejects private entries and preserves host errors', async () => {
    const changed = await executeWasi(
      assets,
      pricingSource.replace('price * (100 - percent) / 100', 'price - percent'),
      'call',
      undefined,
      {
        entry: 'pricing.cv',
        call: { name: 'quote', arguments: [1200, 25] },
      },
    );
    expect(readQuote(changed)?.total).toBe(1175);
    const denied = await executeWasi(
      assets,
      'private fn hidden(value: i32) -> i32 => value;',
      'call',
      undefined,
      {
        call: { name: 'hidden', arguments: [1] },
      },
    );
    expect(denied.exitCode).toBe(1);
    expect(denied.hosting?.diagnostics).not.toBe('');
    expect(denied.hosting?.status).toBe('unavailable');
    expect(denied.artifacts).toEqual([]);
  });

  it('does not run a program entry or inline tests when calling a function', async () => {
    const result = await executeWasi(
      assets,
      `${pricingSource}\nprintln("entry must not run");\ntest "not selected" { check(false); }`,
      'call',
      undefined,
      {
        call: { name: 'quote', arguments: [1200, 25] },
      },
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('runs inline tests from an explicitly supplied helper file and detects a changed rule', async () => {
    const example = workspaceExamples[0];
    const input = { files: { 'pricing.cv': pricingSource } };
    const result = await executeWasi(assets, example.source, 'test', undefined, input);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('2 passed; 0 failed');
    const failed = await executeWasi(assets, example.source, 'test', undefined, {
      files: { 'pricing.cv': pricingSource.replace('== 900', '== 901') },
    });
    expect(failed.exitCode).toBe(1);
    expect(failed.stderr).toContain('1 passed; 1 failed');
  });

  it('reads supplied input and a virtual file, and exposes only generated user files', async () => {
    const example = workspaceExamples[1];
    const result = await executeWasi(assets, example.source, 'run', undefined, {
      stdin: 'Edited title\n',
      files: { 'items.txt': 'First item\nSecond item\n' },
    });
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('Saved report.txt\n');
    expect(result.artifacts).toEqual([
      {
        path: 'report.txt',
        content: 'Edited title\n====================\nFirst item\nSecond item\n',
      },
    ]);
    const isolated = await executeWasi(
      assets,
      'import std::fs using { status, PathKind }\nprintln(status("report.txt")? != PathKind::Missing);',
      'run',
    );
    expect(isolated.exitCode).toBe(0);
    expect(isolated.stdout).toBe('false\n');
  });

  it('rejects traversal, packaged-library overrides, excessive inputs and invalid call arguments', () => {
    for (const path of [
      '../main.cv',
      '/main.cv',
      'crafts/carven/std/core.cv',
      'bin/carven',
      'generated/result.txt',
    ]) {
      expect(() => validateExecutionInput({ files: { [path]: '' } })).toThrow();
    }
    expect(() => validateExecutionInput({ stdin: 'x'.repeat(65537) })).toThrow();
    expect(() => validateExecutionInput({ files: { 'huge.txt': 'x'.repeat(262145) } })).toThrow();
    expect(() =>
      validateExecutionInput({ call: { name: 'quote', arguments: [2147483648] } }),
    ).toThrow();
  });
});

it('keeps a real hosting session, reloads valid source, and computes new inputs with the old implementation after rejection', async () => {
  const session = new WasiHostingSession(assets);
  const source = 'const test "loaded once" { print("loaded;"); }\n' + pricingSource;
  const run = (text: string, price = 1200) =>
    session.run(text, { entry: 'pricing.cv', call: { name: 'quote', arguments: [price, 25] } });
  try {
    const first = await run(source);
    expect(first.exitCode).toBe(0);
    expect(first.stdout).toBe('loaded;');
    expect(first.hosting).toMatchObject({ status: 'loaded', revision: 1 });
    const second = await run(source, 2400);
    expect(second.stdout).toBe('');
    expect(second.hosting).toMatchObject({ status: 'unchanged', revision: 1 });
    expect(readQuote(second)?.total).toBe(1800);
    const changed = source.replace('price * (100 - percent) / 100', 'price - percent');
    expect((await run(changed)).hosting).toMatchObject({ status: 'reloaded', revision: 2 });
    const broken = changed.replace('total: total', 'total: "invalid"');
    const rejected = await run(broken, 3000);
    expect(rejected.exitCode).toBe(0);
    expect(rejected.hosting).toMatchObject({ status: 'retained', revision: 2 });
    expect(rejected.hosting?.diagnostics).toContain('CV-TYPE-MISMATCH');
    expect(readQuote(rejected)?.total).toBe(2975);
    const nextInput = await run(broken, 5000);
    expect(nextInput.stdout).toBe('');
    expect(readQuote(nextInput)?.total).toBe(4975);
    expect(nextInput.hosting?.revision).toBe(2);
    const repaired = await run(source, 4000);
    expect(readQuote(repaired)?.total).toBe(3000);
    expect(repaired.hosting).toMatchObject({ status: 'reloaded', revision: 3 });
  } finally {
    session.close();
  }
});

it('recovers from an invalid first load and rejects a removed entry without losing the active code', async () => {
  const session = new WasiHostingSession(assets);
  const run = (source: string) =>
    session.run(source, { entry: 'pricing.cv', call: { name: 'quote', arguments: [1200, 25] } });
  try {
    expect((await run('fn broken(')).hosting).toMatchObject({ status: 'unavailable', revision: 0 });
    expect((await run(pricingSource)).hosting).toMatchObject({ status: 'loaded', revision: 1 });
    const hidden = await run(pricingSource.replace('fn quote(', 'private fn quote('));
    expect(hidden.hosting).toMatchObject({ status: 'retained', revision: 1 });
    expect(readQuote(hidden)?.total).toBe(900);
    session.close();
    expect((await run(pricingSource)).hosting).toMatchObject({ status: 'loaded', revision: 1 });
  } finally {
    session.close();
  }
});
