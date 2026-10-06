// @vitest-environment jsdom

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import PlaygroundDiagnostics from '../src/components/PlaygroundDiagnostics';
import { diagnosticParts, diagnosticSelection } from '../src/playground/diagnostics';
import { executeWasi, parseCrafts } from '../src/playground/wasi';

let root: Root | undefined;
beforeAll(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(async () => {
  if (root) await act(() => root!.unmount());
  root = undefined;
  document.body.replaceChildren();
});

async function render(content: ReactNode) {
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(() => root!.render(content));
  return host;
}

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

  it('navigates valid source locations with keyboard buttons and leaves invalid locations plain', async () => {
    const stderr = ' --> main.cv:1:1\n --> main.cv:2:1\n<unsafe>\n';
    const onSelect = vi.fn();
    const host = await render(
      <PlaygroundDiagnostics
        text={stderr}
        source="let value = 1;"
        locale="en"
        onSelect={onSelect}
      />,
    );
    const location = host.querySelector<HTMLButtonElement>(
      '[aria-label="Go to main.cv line 1, byte column 1"]',
    )!;
    expect(location.type).toBe('button');
    expect(location.tabIndex).toBe(0);
    await act(() => location.click());
    expect(onSelect).toHaveBeenCalledWith({ line: 1, column: 1 });
    expect(host.querySelector('[aria-label="Go to main.cv line 2, byte column 1"]')).toBeNull();
    expect(host.textContent).toBe(stderr);
    expect(host.querySelector('unsafe')).toBeNull();
  });

  it.each([
    ['en', 'Standard output', 'Diagnostics'],
    ['zh', '标准输出', '诊断'],
  ] as const)(
    'shows %s Check stdout separately from navigable diagnostics',
    async (locale, outputLabel, diagnosticLabel) => {
      const stdout = '准备 <tag>\n --> main.cv:1:1\npartial';
      const stderr = 'carven: check passed\n --> main.cv:1:1\n';
      const host = await render(
        <PlaygroundDiagnostics
          stdout={stdout}
          text={stderr}
          source={'const { println("hello"); }'}
          locale={locale}
          onSelect={() => {}}
        />,
      );
      const output = host.querySelector(`[aria-label="${outputLabel}"]`)!;
      const diagnostics = host.querySelector(`[aria-label="${diagnosticLabel}"]`)!;
      const sourceLocation =
        '[aria-label="Go to main.cv line 1, byte column 1"], [aria-label="定位到 main.cv 第 1 行，第 1 字节列"]';
      expect(output.textContent).toBe(stdout);
      expect(output.querySelector(sourceLocation)).toBeNull();
      expect(output.querySelector('tag')).toBeNull();
      expect(diagnostics.textContent).toBe(stderr);
      expect(diagnostics.querySelector(sourceLocation)).not.toBeNull();
    },
  );

  it('shows captured output when diagnostics are empty', async () => {
    const host = await render(
      <PlaygroundDiagnostics
        stdout="compile-time output"
        text=""
        source=""
        locale="en"
        onSelect={() => {}}
      />,
    );
    expect(host.querySelector('[aria-label="Standard output"]')?.textContent).toBe(
      'compile-time output',
    );
    expect(host.querySelector('[aria-label="Diagnostics"]')).toBeNull();
  });

  it('resolves actual packaged compiler diagnostics to the offending source character', async () => {
    const [wasm, crafts] = await Promise.all([
      readFile(resolve('public/playground-assets/carven.wasm')),
      readFile(resolve('public/playground-assets/crafts.json'), 'utf8'),
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
