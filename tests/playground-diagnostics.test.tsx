import { readFile } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PlaygroundDiagnostics from '../src/components/PlaygroundDiagnostics';
import { diagnosticParts, diagnosticSelection } from '../src/playground/diagnostics';
import { executeWasi, parseCrafts } from '../src/playground/wasi';

describe('playground source diagnostic navigation', () => {
  it('preserves stderr and links only main.cv source-frame anchors', () => {
    const stderr = [
      'error [CV-TYPE-MISMATCH]: text mentions main.cv:1:2',
      ' --> main.cv:1:2',
      '  |',
      '1 | let value = "<tag>";',
      ' ::: /main.cv:2:1',
      ' ::: crafts/carven/std/text.cv:1:2',
      ' --> other-main.cv:1:2',
      '',
    ].join('\n');
    const parts = diagnosticParts(stderr);
    expect(parts.map((part) => part.text).join('')).toBe(stderr);
    expect(parts.flatMap((part) => part.location ?? [])).toEqual([
      { line: 1, column: 2 },
      { line: 2, column: 1 },
    ]);
  });

  it('does not create links for zero, unsafe or malformed coordinates', () => {
    const stderr =
      ' --> main.cv:0:1\n --> main.cv:1:0\n --> main.cv:1:9007199254740992\n --> main.cv:1:2suffix';
    expect(diagnosticParts(stderr).some((part) => part.location)).toBe(false);
    expect(
      diagnosticParts(stderr)
        .map((part) => part.text)
        .join(''),
    ).toBe(stderr);
  });

  it('maps byte columns after Chinese and supplementary scalars to UTF-16 selections', () => {
    const source = '\t中文😀x';
    expect(diagnosticSelection(source, { line: 1, column: 8 })).toEqual({ anchor: 3, head: 5 });
    expect(diagnosticSelection(source, { line: 1, column: 12 })).toEqual({ anchor: 5, head: 6 });
    expect(diagnosticSelection(source, { line: 1, column: 2 })).toEqual({ anchor: 1, head: 2 });
    expect(diagnosticSelection(source, { line: 1, column: 3 })).toBeNull();
  });

  it('accepts line-end and EOF carets while rejecting out-of-range coordinates', () => {
    expect(diagnosticSelection('a\n', { line: 1, column: 2 })).toEqual({ anchor: 1, head: 1 });
    expect(diagnosticSelection('a\n', { line: 2, column: 1 })).toEqual({ anchor: 2, head: 2 });
    expect(diagnosticSelection('', { line: 1, column: 1 })).toEqual({ anchor: 0, head: 0 });
    expect(diagnosticSelection('a', { line: 1, column: 3 })).toBeNull();
    expect(diagnosticSelection('a', { line: 2, column: 1 })).toBeNull();
    expect(diagnosticSelection('a', { line: -1, column: 1 })).toBeNull();
    expect(diagnosticSelection('a', { line: 1, column: 1.5 })).toBeNull();
  });

  it('normalizes CRLF offsets to the editor document without counting tabs as display columns', () => {
    const source = 'first\r\n\t中文x';
    expect(diagnosticSelection(source, { line: 2, column: 8 })).toEqual({ anchor: 9, head: 10 });
    expect(diagnosticSelection(source, { line: 1, column: 6 })).toEqual({ anchor: 5, head: 5 });
    expect(diagnosticSelection(source, { line: 1, column: 7 })).toEqual({ anchor: 5, head: 5 });
  });

  it('renders valid navigation as keyboard buttons and leaves invalid locations plain', () => {
    const stderr = ' --> main.cv:1:1\n --> main.cv:2:1\n<unsafe>\n';
    const html = renderToStaticMarkup(
      <PlaygroundDiagnostics
        text={stderr}
        source="let value = 1;"
        locale="en"
        onSelect={() => {}}
      />,
    );
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html).toContain('type="button"');
    expect(html).toContain('Go to main.cv line 1, byte column 1');
    expect(html).toContain('main.cv:2:1');
    expect(html).toContain('&lt;unsafe&gt;');
    expect(html).not.toContain('<unsafe>');
  });

  it('resolves actual packaged compiler diagnostics to the offending source character', async () => {
    const root = new URL('../public/playground-assets/', import.meta.url);
    const [wasm, crafts] = await Promise.all([
      readFile(new URL('carven.wasm', root)),
      readFile(new URL('crafts.json', root), 'utf8'),
    ]);
    const source = 'let text = "中文😀"; let value: i32 = "oops";';
    const result = await executeWasi(
      {
        module: await WebAssembly.compile(wasm),
        files: parseCrafts(JSON.parse(crafts)),
      },
      source,
      'check',
    );
    expect(result.exitCode).toBe(1);
    const location = diagnosticParts(result.stderr).find((part) => part.location)?.location;
    expect(location).toEqual({
      line: 1,
      column: new TextEncoder().encode(source.slice(0, source.indexOf('"oops"'))).length + 1,
    });
    expect(diagnosticSelection(source, location!)).toEqual({
      anchor: source.indexOf('"oops"'),
      head: source.indexOf('"oops"') + 1,
    });
  });
});
