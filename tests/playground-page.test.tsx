// @vitest-environment jsdom

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { act, type ReactNode } from 'react';
import { EditorView } from '@codemirror/view';
import { createRoot, type Root } from 'react-dom/client';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Playground from '../src/views/Playground';
import Home from '../src/views/Home';
import { playgroundExamples } from '../src/playground/examples';
import type { Locale } from '../src/lib/i18n';
import { executeWasi, parseCrafts, type CompilerAssets } from '../src/playground/wasi';
import type { Action } from '../src/playground/protocol';

let assets: CompilerAssets;
let root: Root | undefined;

// jsdom has no browser workers. Preserve the real session protocol and execute
// each posted source with the packaged compiler rather than fixture responses.
class CompilerWorker extends EventTarget {
  stopped = false;
  async postMessage(request: { id: number; source: string; action: Action }) {
    const result = await executeWasi(assets, request.source, request.action);
    if (!this.stopped) {
      this.dispatchEvent(
        new MessageEvent('message', {
          data: { id: request.id, type: 'result', result },
        }),
      );
    }
  }
  terminate() {
    this.stopped = true;
  }
}

beforeAll(async () => {
  const [wasm, crafts] = await Promise.all([
    readFile(resolve('public/playground-assets/carven.wasm')),
    readFile(resolve('public/playground-assets/crafts.json'), 'utf8'),
  ]);
  assets = {
    module: await WebAssembly.compile(wasm),
    files: parseCrafts(JSON.parse(crafts)),
  };
  // CodeMirror measures text in browsers; jsdom deliberately has no layout.
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
});

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('Worker', CompilerWorker);
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduced-motion'),
    addListener() {},
    removeListener() {},
  }));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(async () => {
  if (root) await act(() => root!.unmount());
  root = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mountPage(component: () => ReactNode, entry = '/') {
  await import('../src/components/PlaygroundEditor');
  const route = createRootRoute({ component });
  const router = createRouter({
    routeTree: route,
    trailingSlash: 'always',
    history: createMemoryHistory({ initialEntries: [entry] }),
  });
  await router.load();
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(() => root!.render(<RouterProvider router={router} />));
  return host;
}

async function mountPlayground(entry = '/') {
  const host = await mountPage(() => <Playground locale="en" />, entry);
  await act(async () => {
    await vi.waitFor(() =>
      expect(host.querySelector('[aria-label="main.cv source editor"]')).not.toBeNull(),
    );
  });
  return host;
}

async function replaceSource(host: HTMLElement, source: string) {
  const editor = host.querySelector<HTMLElement>('[aria-label="main.cv source editor"]')!;
  // Select all and paste through CodeMirror's normal DOM input handlers. jsdom
  // supplies no system clipboard, so the paste event carries the user's text.
  await act(() => {
    editor.focus();
    editor.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'a',
        code: 'KeyA',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  const paste = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(paste, 'clipboardData', {
    value: { getData: () => source, files: [] },
  });
  await act(() => editor.dispatchEvent(paste));
}

async function check(host: HTMLElement) {
  const view = [...host.querySelectorAll('label')].find(
    (label) => label.textContent === 'Result view',
  )!.control as HTMLSelectElement;
  await act(() => {
    view.value = 'diagnostics';
    view.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const button = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'Check',
  )!;
  expect(button.disabled).toBe(false);
  await act(async () => button.click());
}

describe('Playground Check from edited source to visible result', () => {
  it('displays compile-time stdout and passing diagnostics without running the entry', async () => {
    const host = await mountPlayground();
    await replaceSource(
      host,
      'const { print("准备 "); println("完成"); }\nprintln("runtime only");',
    );
    await check(host);
    expect(host.querySelector('[aria-label="Standard output"]')?.textContent).toBe('准备 完成\n');
    expect(host.querySelector('[aria-label="Diagnostics"]')?.textContent).toContain('check passed');
    expect(
      [...host.querySelectorAll('[role="status"]')].some((status) =>
        status.textContent?.includes('Completed'),
      ),
    ).toBe(true);
  });

  it('keeps output printed before a failing compile-time assertion visible with its diagnostic', async () => {
    const host = await mountPlayground();
    await replaceSource(
      host,
      'const { println("before failure"); assert(false, "static failure"); }',
    );
    await check(host);
    expect(host.querySelector('[aria-label="Standard output"]')?.textContent).toBe(
      'before failure\n',
    );
    expect(host.querySelector('[aria-label="Diagnostics"]')?.textContent).toContain(
      'static failure',
    );
    expect(
      [...host.querySelectorAll('[role="status"]')].some((status) =>
        status.textContent?.includes('Failed'),
      ),
    ).toBe(true);
  });
});

describe('Homepage examples and Playground navigation', () => {
  it.each(['en', 'zh'] as const)(
    'opens every %s homepage example in its shared preset',
    async (locale: Locale) => {
      const host = await mountPage(() => <Home locale={locale} />);
      const choices = [...host.querySelectorAll<HTMLButtonElement>('.showcase-tabs button')];
      expect(choices.length).toBeGreaterThan(0);
      const ids = new Set<string>();
      for (const choice of choices) {
        await act(() => choice.click());
        const link = host.querySelector<HTMLAnchorElement>(
          '.showcase-caption-item[aria-hidden="false"] .showcase-try',
        )!;
        expect(link).not.toBeNull();
        const url = new URL(link.href);
        expect(url.pathname).toBe(locale === 'zh' ? '/zh/playground/' : '/playground/');
        const id = new URLSearchParams(url.hash.slice(1)).get('example')!;
        expect(playgroundExamples.some((example) => example.id === id)).toBe(true);
        ids.add(id);
      }
      expect(ids.size).toBe(choices.length);
    },
  );

  it.each(playgroundExamples)(
    'loads the exact $id source and default view from a direct link',
    async (example) => {
      const host = await mountPlayground(`/#example=${example.id}`);
      expect((host.querySelector('#playground-example') as HTMLSelectElement).value).toBe(
        example.id,
      );
      expect(EditorView.findFromDOM(host.querySelector('.cm-editor')!)!.state.doc.toString()).toBe(
        example.source,
      );
      expect((host.querySelector('#playground-result-view') as HTMLSelectElement).value).toBe(
        example.defaultView,
      );
    },
  );

  it('generates native C++ with the editor shortcut and returns to Run when switching presets', async () => {
    const host = await mountPlayground('/#example=native-json');
    expect(host.querySelector('.playground-description')?.textContent).toContain(
      'cannot execute external C++ calls',
    );
    const editor = host.querySelector<HTMLElement>('[aria-label="main.cv source editor"]')!;
    await act(async () => {
      editor.focus();
      editor.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    await act(async () => {
      await vi.waitFor(() =>
        expect(host.querySelector('[aria-label="main.cpp"]')?.textContent).toContain(
          '#include <nlohmann/json.hpp>',
        ),
      );
    });
    const select = host.querySelector<HTMLSelectElement>('#playground-example')!;
    await act(() => {
      select.value = 'simd-bytes';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect((host.querySelector('#playground-result-view') as HTMLSelectElement).value).toBe(
      'output',
    );
    expect(
      [...host.querySelectorAll('button')].some((button) => button.textContent === 'Run'),
    ).toBe(true);
    expect(host.querySelector('[aria-label="main.cpp"]')).toBeNull();
  });
});
