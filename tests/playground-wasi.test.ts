import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { playgroundExamples } from '../src/playground/examples';
import heroSource from '../src/content/hero.cv?raw';
import type { WorkspacePreset } from '../src/playground/workspace-examples';
import {
  executeWasi,
  parseCrafts,
  loadCompilerAssets,
  type CompilerAssets,
} from '../src/playground/wasi';

const root = new URL('../public/playground-assets/', import.meta.url);
type RunnablePreset = Extract<(typeof playgroundExamples)[number], { defaultView: 'output' }>;
const presetOutput: Record<RunnablePreset['id'], string> = {
  'toml-summary': 'api: 2\nweb: 1\naccepted: 3\n',
  'async-pipeline': 'Orders: 3\nTotal (cents): 5400\n',
  'closure-policy': 'Original quote: 103\nUpdated quote: 110\n',
  'channel-pipeline': 'Backpressure: true\nBatches: 3 total: 60\n',
  'file-report':
    'Release storefront\nindex.html: 280 bytes\napp.js: 420 bytes\nTotal: 700 / 1000 bytes\n',
  'json-config': '{"workers":8,"tags":["stable","observed"]}\n{"workers":2,"tags":["stable"]}\n',
  'log-analysis': '37ms: token=[redacted]\nrejected: nope malformed\n42ms: 超时\n',
  'async-workflow': 'west: 3 records, total 12\neast: 3 records, total 9\nselected 1: 21\n',
  'async-scope': 'compile time: 1; runtime: 1\n',
  'audio-mixer': 'samples=9 clipped=1 peak=1.00\nfirst=0.625 second=0.375 last=1.000\n',
  hello: 'Answer: 42\n',
  'structured-output': `Order {
    id: 7,
    status: Status::Shipped(
        3,
    ),
    items: [
        "disk",
        "cable",
    ],
}
`,
  'typed-failures': 'ok 9000\nmissing 8080\nDenied: denied\nBad port: 9x00\n',
  'static-text': 'Commands:\n  build: Compile the project\n  run: Run the program\n\n',
  specialization: 'true false\n',
  'simd-bytes': '2\n',
};

describe('Playground compiler assets', () => {
  it('loads the compiler and Crafts beneath the deployment prefix', async () => {
    const [wasm, crafts] = await Promise.all([
      readFile(new URL('carven.wasm', root)),
      readFile(new URL('crafts.json', root), 'utf8'),
    ]);
    const base = new URL('https://example.test/project/playground-assets/');
    const fetchAsset = vi.fn(async (url: URL) => {
      if (url.pathname === new URL('carven.wasm', base).pathname) return new Response(wasm);
      if (url.pathname === new URL('crafts.json', base).pathname) return new Response(crafts);
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchAsset);
    vi.stubEnv('COMPILER_REVISION', 'release-commit');

    try {
      const assets = await loadCompilerAssets(base);
      expect(fetchAsset.mock.calls.map(([url]) => url.searchParams.get('v'))).toEqual([
        'release-commit',
        'release-commit',
      ]);
      const result = await executeWasi(assets, 'println("你好");', 'run');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('你好\n');
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
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

  it('runs the homepage greeting and its inline test', async () => {
    const program = await executeWasi(assets, heroSource, 'run');
    expect(program.exitCode).toBe(0);
    expect(program.stdout).toBe('Hello, World!\n');
    const tests = await executeWasi(assets, heroSource, 'test');
    expect(tests.exitCode).toBe(0);
    expect(tests.stdout).toBe('');
  });

  it('ships every project source in the formatter’s default style', async () => {
    for (const example of playgroundExamples) {
      const preset: WorkspacePreset = example;
      for (const [path, source] of Object.entries({ 'main.cv': preset.source, ...preset.files })) {
        if (!path.endsWith('.cv')) continue;
        const result = await executeWasi(assets, source, 'format');
        expect(result.formattedSource, `${example.id}/${path}`).toBe(source);
      }
    }
  });

  for (const example of playgroundExamples) {
    if (example.defaultView !== 'output') continue;
    it(`executes the ${example.id} editor preset in a fresh in-memory filesystem`, async () => {
      const preset: WorkspacePreset = example;
      const result = await executeWasi(assets, example.source, 'run', undefined, {
        files: preset.files,
        stdin: preset.stdin,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe(presetOutput[example.id]);
      expect(result.stderr).toBe('');
      if (example.id === 'file-report') {
        expect(result.artifacts.map((file) => file.path)).toEqual([
          'release.toml',
          'reports/release.txt',
        ]);
        expect(result.artifacts.find((file) => file.path === 'reports/release.txt')?.content).toBe(
          result.stdout.trimEnd(),
        );
      } else expect(result.artifacts).toEqual([]);
      expect(result.truncated).toBe(false);
    });
  }

  it('runs the async test preset without executing a program entry', async () => {
    const example = playgroundExamples.find((item) => item.id === 'async-tests')!;
    const result = await executeWasi(
      assets,
      `${example.source}\nprintln("entry must not run");`,
      'test',
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('carven: tests: 2 passed; 0 failed\n');
    expect(result.truncated).toBe(false);
  });

  it('reports failed tests while continuing with later test blocks', async () => {
    const result = await executeWasi(
      assets,
      'test "fails" { check(1 == 2); }\nasync test "continues" { println("next test"); check(true); }\nprintln("entry must not run");',
      'test',
    );
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('next test\n');
    expect(result.stderr).toContain('carven: tests: 1 passed; 1 failed');
  });

  it('uses the WASI host clock for static and interpreted timer operations', async () => {
    const result = await executeWasi(
      assets,
      `
import std::time using { TimePoint, sleep, TimeRangeError }
const { await sleep(1ms)?; }
async fn main() throw TimeRangeError {
    let before = TimePoint::now();
    await sleep(1ms)?;
    assert(!TimePoint::now().is_before(before));
    println("timer complete");
}
`,
      'run',
    );
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('timer complete\n');
  });

  it('observes the empty browser input stream as EOF', async () => {
    const result = await executeWasi(
      assets,
      `
import std::io using IOError;
const {
    assert(match await stdin().read_line()? {
        .End => true,
        .Data(_) => false,
    });
}
async fn main() throw IOError {
    let input = stdin();
    match await input.read_line()? {
        .End => println("end of input"),
        .Data(_) => println("unexpected input"),
    }
}
`,
      'run',
    );
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('end of input\n');
  });

  it('executes awaited output through the browser sink', async () => {
    const result = await executeWasi(
      assets,
      'import std::io using { write_stdout_async, IOError }\nasync fn main() throw IOError { await write_stdout_async(&&[97u8, 115u8, 121u8, 110u8, 99u8, 10u8])?; }',
      'run',
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe('async\n');
  });

  it('closes a cancelled writer before it can publish output', async () => {
    const result = await executeWasi(
      assets,
      `import std::async using { yield_once, close }
import std::io using { write_stdout_async, IOError }
async fn write_later() throw IOError {
    await yield_once();
    await write_stdout_async(&&[88u8])?;
}
async fn main() {
    async let writer = write_later();
    cancel writer;
    await close(writer);
    println("closed");
}`,
      'run',
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe('closed\n');
  });

  it('generates the native JSON preset while reporting the browser execution boundary', async () => {
    const example = playgroundExamples.find((item) => item.id === 'native-json')!;
    const compiled = await executeWasi(assets, example.source, 'compile');
    expect(compiled.exitCode).toBe(0);
    expect(compiled.stderr).toBe('');
    const cpp = compiled.artifacts.find((artifact) => artifact.path === 'main.cpp')!.content;
    expect(cpp).toContain('#include <nlohmann/json.hpp>');
    const interpreted = await executeWasi(assets, example.source, 'run');
    expect(interpreted.exitCode).toBe(1);
    expect(interpreted.stderr).toContain('CV-INTERPRET-ADMISSION');
    expect(interpreted.stdout).toBe('');
  });

  it('captures const block streams during Check without running the entry', async () => {
    const result = await executeWasi(
      assets,
      'const { print("准备 "); println("完成"); eprintln("compile-time stderr"); }\nprintln("runtime only");',
      'check',
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('准备 完成\n');
    expect(result.stderr).toBe('compile-time stderr\n');
    expect(result.artifacts).toEqual([]);
  });

  it('preserves const block output before a failed Check', async () => {
    const result = await executeWasi(
      assets,
      'const { println("before failure"); assert(false, "static failure"); }',
      'check',
    );
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('before failure\n');
    expect(result.stderr).toContain('static failure');
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

  it('formats source with the formatter while preserving comments, literals, and syntax-only names', async () => {
    const source = '// 保留注释\nlet   value=missing(  "你好  世界" ,2);\nprintln( value );';
    const result = await executeWasi(assets, source, 'format');
    expect(result.exitCode).toBe(0);
    expect(result.formattedSource).toBe(
      '// 保留注释\nlet value = missing("你好  世界", 2);\nprintln(value);\n',
    );
    expect(result.stderr).toBe('');
    expect(result.artifacts).toEqual([]);
  });

  it('returns no replacement source when the formatter rejects malformed syntax', async () => {
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
