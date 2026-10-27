// @vitest-environment jsdom

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { act, type ReactNode } from 'react';
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
import heroSource from '../src/content/hero.cv?raw';
import heroBuildSource from '../src/content/hero-build.cv?raw';
import { playgroundExamples } from '../src/playground/examples';
import type { Locale } from '../src/lib/i18n';
import {
  executeWasi,
  parseCrafts,
  WasiHostingSession,
  type CompilerAssets,
} from '../src/playground/wasi';
import type { Action, ExecutionInput } from '../src/playground/protocol';
import { pricingSource } from '../src/playground/workspace-examples';
import { sceneSource } from '../src/playground/scene-example';

let assets: CompilerAssets;
let root: Root | undefined;

// jsdom has no browser workers. Preserve the real session protocol and execute
// each posted source with the packaged compiler rather than fixture responses.
class CompilerWorker extends EventTarget {
  stopped = false;
  hosting?: WasiHostingSession;

  async postMessage(request: {
    id: number;
    source: string;
    action: Action;
    input?: ExecutionInput;
  }) {
    if (!request.action) {
      this.hosting?.close();
      return;
    }
    if (request.action === 'call') this.hosting ??= new WasiHostingSession(assets);
    const result =
      request.action === 'call'
        ? await this.hosting!.run(request.source, request.input ?? {})
        : await executeWasi(assets, request.source, request.action, undefined, request.input);
    if (!this.stopped) {
      this.dispatchEvent(
        new MessageEvent('message', {
          data: { id: request.id, type: 'result', result },
        }),
      );
    }
  }

  terminate() {
    this.hosting?.close();
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
  vi.stubGlobal('matchMedia', (query: string) =>
    Object.assign(new EventTarget(), {
      matches: query.includes('reduced-motion'),
    }),
  );
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

async function mountPlayground(entry = '/#example=hello') {
  const host = await mountPage(() => <Playground locale="en" />, entry);
  await act(async () => {
    await vi.waitFor(() => expect(host.querySelector('.cm-content')).not.toBeNull());
  });

  return host;
}

async function replaceSource(host: HTMLElement, source: string, filename = 'main.cv') {
  const editor = host.querySelector<HTMLElement>(
    `[aria-label="${filename} source editor"], [aria-label="${filename} 源码编辑器"]`,
  )!;
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
  it('formats edited source and lets the user undo the formatting', async () => {
    const host = await mountPlayground();
    const source = 'let   answer=42;\nprintln( answer );';
    await replaceSource(host, source);
    const format = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === 'Format',
    )!;
    await act(async () => format.click());
    const editor = host.querySelector<HTMLElement>('[aria-label="main.cv source editor"]')!;
    expect(editor.textContent).toBe('let answer = 42;println(answer);');
    await act(() => {
      editor.focus();
      editor.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'z',
          code: 'KeyZ',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(editor.textContent).toBe(source.replace(/\r?\n/g, ''));
  });

  it('restores the current draft after reopening the Playground', async () => {
    const host = await mountPlayground('/#example=hello');
    const source = 'println("saved draft");';
    await replaceSource(host, source);
    await act(() => root!.unmount());
    root = undefined;
    host.remove();
    const reopened = await mountPlayground('/#example=hello');
    expect(reopened.querySelector('[aria-label="main.cv source editor"]')?.textContent).toBe(
      source,
    );
  });

  it('displays compile-time stdout and passing diagnostics without running the entry', async () => {
    const host = await mountPlayground();
    await replaceSource(
      host,
      'const { print("准备 "); println("完成"); }\nprintln("runtime only");',
    );
    await check(host);
    expect(host.querySelector('[aria-label="Standard output"]')?.textContent).toBe('准备 完成\n');
    expect(host.querySelector('[aria-label="Diagnostics"]')).toBeNull();
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

describe('Homepage and Playground navigation', () => {
  it.each(['en', 'zh'] as const)(
    'links the %s introduction to learning resources',
    async (locale) => {
      const host = await mountPage(() => <Home locale={locale} />);
      const displayedSource = () =>
        host.querySelector('.hero-language [aria-hidden="false"] pre code')?.textContent;
      expect(displayedSource()).toBe(heroSource.trimEnd());
      const buildFile = [...host.querySelectorAll('button')].find(
        (button) => button.textContent === 'build.cv',
      )!;
      await act(() => buildFile.click());
      await vi.waitFor(() => expect(displayedSource()).toBe(heroBuildSource.trimEnd()));
      const mainFile = [...host.querySelectorAll('button')].find(
        (button) => button.textContent === 'main.cv',
      )!;
      await act(() => mainFile.click());
      await vi.waitFor(() => expect(displayedSource()).toBe(heroSource.trimEnd()));
      const prefix = locale === 'zh' ? '/zh' : '';
      const links = [...host.querySelectorAll<HTMLAnchorElement>('a')].map(
        (link) => new URL(link.href),
      );
      for (const path of ['/learn/first-program/', '/learn/build/', '/reference/interop/']) {
        expect(links.some((url) => url.pathname === `${prefix}${path}`)).toBe(true);
      }
    },
  );

  it.each(['output', 'tests', 'cpp'] as const)(
    'loads a preset from a direct link in the %s view',
    async (view) => {
      const example = playgroundExamples.find((item) => item.defaultView === view)!;
      let copied = '';
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: async (text: string) => {
            copied = text;
          },
        },
      });
      const host = await mountPlayground(`/#example=${example.id}`);
      expect((host.querySelector('#playground-example') as HTMLSelectElement).value).toBe(
        example.id,
      );
      const copy = [...host.querySelectorAll('button')].find(
        (button) => button.textContent === 'Copy',
      )!;
      await act(async () => copy.click());
      const project = example as { files?: Record<string, string>; selectedFile?: string };
      expect(copied).toBe(
        project.selectedFile && project.files
          ? project.files[project.selectedFile]
          : example.source,
      );
      expect((host.querySelector('#playground-result-view') as HTMLSelectElement).value).toBe(
        example.defaultView,
      );
    },
  );

  it('opens the async test preset in Test mode and reports results from edited source', async () => {
    const host = await mountPlayground('/#example=async-tests');
    expect((host.querySelector('#playground-result-view') as HTMLSelectElement).value).toBe(
      'tests',
    );
    const test = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === 'Test',
    )!;
    expect(test.disabled).toBe(false);
    await act(async () => test.click());
    expect(host.querySelector('.playground-result-body')?.textContent).toContain(
      '2 passed; 0 failed',
    );

    await replaceSource(
      host,
      'async test "fails" { check(false); }\nprintln("entry must not run");',
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
    expect((host.querySelector('#playground-result-view') as HTMLSelectElement).value).toBe(
      'tests',
    );
    expect(host.querySelector('.playground-result-body')?.textContent).toContain(
      '0 passed; 1 failed',
    );
    expect(host.querySelector('.playground-result-body')?.textContent).not.toContain(
      'entry must not run',
    );
    expect(host.querySelector('.playground-status')?.textContent).toContain('Failed');
  });

  it('asks to run tests instead of displaying a previous program result', async () => {
    const host = await mountPlayground('/#example=hello');
    const run = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === 'Run',
    )!;
    await act(async () => run.click());
    expect(host.querySelector('.playground-result-body')?.textContent).toContain('Answer: 42');
    const view = host.querySelector<HTMLSelectElement>('#playground-result-view')!;
    await act(() => {
      view.value = 'tests';
      view.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(host.querySelector('.playground-result-body')?.textContent).toContain('Choose “Test”');
    expect(host.querySelector('.playground-result-body')?.textContent).not.toContain('Answer: 42');
  });

  it('generates native C++ with the editor shortcut and returns to Run when switching presets', async () => {
    const host = await mountPlayground('/#example=native-json');
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
      select.value = 'toml-summary';
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

it('updates the hosted pricing preview from edited source and tests that same helper', async () => {
  const host = await mountPage(() => <Playground locale="en" />, '/#example=pricing-preview');
  await act(async () => {
    await vi.waitFor(() =>
      expect(host.querySelector('[aria-label="pricing.cv source editor"]')).not.toBeNull(),
    );
  });
  const update = () =>
    [...host.querySelectorAll('button')].find((button) => button.textContent === 'Update preview')!;
  await act(async () => update().click());
  expect(host.querySelector('.playground-order-total')?.textContent).toContain('9.00');
  await replaceSource(
    host,
    pricingSource.replace('price * (100 - percent) / 100', 'price - percent'),
    'pricing.cv',
  );
  expect(host.querySelector('.playground-receipt')?.textContent).toContain(
    'Source changes not applied',
  );
  expect(host.querySelector('.playground-order-total')?.textContent).toContain('9.00');
  await act(async () => update().click());
  expect(host.querySelector('.playground-order-total')?.textContent).toContain('11.75');
  const view = host.querySelector<HTMLSelectElement>('#playground-result-view')!;
  await act(() => {
    view.value = 'tests';
    view.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const test = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'Test',
  )!;
  await act(async () => test.click());
  expect(host.querySelector('.playground-result-body')?.textContent).toContain(
    '1 passed; 1 failed',
  );
  await replaceSource(host, pricingSource.replace('total: total', 'total: "oops"'), 'pricing.cv');
  await check(host);
  const main = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'main.cv',
  )!;
  await act(() => main.click());
  const diagnostic = host.querySelector<HTMLButtonElement>('[aria-label^="Go to pricing.cv"]');
  expect(diagnostic).not.toBeNull();
  await act(() => diagnostic!.click());
  expect(host.querySelector('[aria-label="pricing.cv source editor"]')).not.toBeNull();
});

it('keeps edited data and standard input in the workspace draft and renders the generated report', async () => {
  const manifest =
    '[release]\nname = "edited"\nbudget = 100\n[[artifact]]\npath = "app.js"\nbytes = 42\n';
  const host = await mountPlayground('/#example=workspace-report');
  const file = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'release.toml',
  )!;
  await act(() => file.click());
  const data = host.querySelector<HTMLTextAreaElement>(
    '[aria-label="release.toml file contents"]',
  )!;
  const input = host.querySelector<HTMLTextAreaElement>('[aria-label="Standard input contents"]')!;
  const setText = (element: HTMLTextAreaElement, text: string) => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
      element,
      text,
    );
    element.dispatchEvent(new Event('input', { bubbles: true }));
  };
  await act(() => setText(data, manifest));
  await act(() => setText(input, 'Edited title\n'));
  const run = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Run')!;
  await act(async () => run.click());
  expect(host.querySelector('[aria-label="report.txt"]')?.textContent).toBe(
    'Edited title\nRelease edited\napp.js: 42 bytes\nTotal: 42 / 100 bytes\n',
  );
  await act(() => root!.unmount());
  root = undefined;
  const reopened = await mountPlayground('/#example=workspace-report');
  const reopenedFile = [...reopened.querySelectorAll('button')].find(
    (button) => button.textContent === 'release.toml',
  )!;
  await act(() => reopenedFile.click());
  expect(
    reopened.querySelector<HTMLTextAreaElement>('[aria-label="release.toml file contents"]')?.value,
  ).toBe(manifest);
  expect(
    reopened.querySelector<HTMLTextAreaElement>('[aria-label="Standard input contents"]')?.value,
  ).toBe('Edited title\n');
});

it.each(['en', 'zh'] as const)(
  'keeps the last valid implementation live after a rejected %s source update',
  async (locale) => {
    const host = await mountPage(() => <Playground locale={locale} />, '/#example=pricing-preview');
    const label = locale === 'zh' ? '更新预览' : 'Update preview';
    const editorLabel = locale === 'zh' ? 'pricing.cv 源码编辑器' : 'pricing.cv source editor';
    await act(async () => {
      await vi.waitFor(() =>
        expect(host.querySelector(`[aria-label="${editorLabel}"]`)).not.toBeNull(),
      );
    });
    const update = () =>
      [...host.querySelectorAll('button')].find((button) => button.textContent === label)!;
    await act(async () => update().click());
    expect(host.querySelector('.playground-order-total')?.textContent).toContain('9.00');
    const editor = host.querySelector<HTMLElement>(`[aria-label="${editorLabel}"]`)!;
    const broken = pricingSource.replace('total: total', 'total: "invalid"');
    await act(() => {
      editor.focus();
      editor.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true }),
      );
    });
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', { value: { getData: () => broken, files: [] } });
    await act(() => editor.dispatchEvent(paste));
    const amount = host.querySelector<HTMLInputElement>('input[type="number"]')!;
    await act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        amount,
        '2400',
      );
      amount.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => update().click());
    expect(host.querySelector('.playground-order-total')?.textContent).toContain('18.00');
    expect(host.querySelector('.playground-reload-error')?.textContent).toContain(
      locale === 'zh'
        ? '上一版实现仍可处理新参数'
        : 'previous implementation still handles new inputs',
    );
    expect(host.querySelector('.playground-receipt')?.textContent).toContain(
      locale === 'zh' ? '版本 1' : 'version 1',
    );
    expect(host.querySelector('.playground-reload-error')?.textContent).toContain(
      'CV-TYPE-MISMATCH',
    );
  },
);

it('adds suggested files immediately, derives folders from paths, and keeps example projects separate', async () => {
  const host = await mountPlayground('/#example=async-pipeline');
  const main = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'main.cv',
  )!;
  await act(() => main.click());
  await replaceSource(host, 'println("Answer: 42");');
  const button = (label: string) =>
    [...host.querySelectorAll('button')].find(
      (item) => item.textContent === label || item.getAttribute('aria-label') === label,
    )!;
  await act(() => button('Add file').click());
  const suggested = host.querySelector<HTMLInputElement>('[aria-label="New file path"]')!.value;
  expect(suggested).toMatch(/\.cv$/);
  await act(() => button('Add').click());
  expect(host.querySelector(`[aria-label="${suggested} source editor"]`)).not.toBeNull();
  expect(host.querySelector('[role="alert"]')).toBeNull();
  expect(button('Run').disabled).toBe(false);
  await act(async () => button('Run').click());
  expect(host.querySelector('.playground-result-body')?.textContent).toBe('Answer: 42\n');
  await act(() => button('Add file').click());
  const second = host.querySelector<HTMLInputElement>('[aria-label="New file path"]')!.value;
  expect(second).toMatch(/\.cv$/);
  expect(second).not.toBe(suggested);
  await act(() => button('Add').click());
  expect(host.querySelector(`[aria-label="${second} source editor"]`)).not.toBeNull();
  await act(() => button('Add file').click());
  const input = host.querySelector<HTMLInputElement>('[aria-label="New file path"]')!;
  await act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      input,
      'src/rules.cv',
    );
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(() => button('Add').click());
  await act(() => button('File tree').click());
  const tree = host.querySelector('[aria-label="Project file tree"]')!;
  expect(tree.textContent).toContain('src');
  expect(tree.textContent).toContain('rules.cv');
  expect(tree.querySelector('[title="main.cv"]')?.textContent).toContain('entry');
  const select = host.querySelector<HTMLSelectElement>('#playground-example')!;
  const switchTo = async (id: string) =>
    act(() => {
      select.value = id;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  await switchTo('toml-summary');
  expect(
    [...host.querySelectorAll('.playground-file-tabs button')].map((item) => item.textContent),
  ).not.toContain(suggested);
  await switchTo('async-pipeline');
  expect(
    [...host.querySelectorAll('.playground-file-tabs button')].map((item) => item.textContent),
  ).toContain(suggested);
  expect(
    [...host.querySelectorAll('.playground-file-tabs button')].filter(
      (item) => item.textContent === 'main.cv',
    ),
  ).toHaveLength(1);
  expect(host.querySelector('[aria-label="Project file tree"]')?.textContent).toContain('rules.cv');
});

it.each(['en', 'zh'] as const)(
  'updates the %s quote automatically and applies edited rules only on request',
  async (locale) => {
    const host = await mountPage(() => <Playground locale={locale} />, '/#example=pricing-preview');
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(host.querySelector('.playground-order-total')?.textContent).toContain('9.00');
    });
    const range = host.querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(range.disabled).toBe(false);
    const setInput = (element: HTMLInputElement, value: string) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        element,
        value,
      );
      element.dispatchEvent(new Event('input', { bubbles: true }));
    };
    await act(() => {
      for (const value of ['10', '20', '30', '40', '50']) setInput(range, value);
    });
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(host.querySelector('.playground-order-total')?.textContent).toContain('6.00');
    });
    expect(host.querySelector('.playground-receipt')?.textContent).toContain(
      locale === 'zh' ? '版本 1' : 'version 1',
    );
    const editorLabel = locale === 'zh' ? 'pricing.cv 源码编辑器' : 'pricing.cv source editor';
    const editor = host.querySelector<HTMLElement>(`[aria-label="${editorLabel}"]`)!;
    await act(() => {
      editor.focus();
      editor.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true }),
      );
    });
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', {
      value: {
        getData: () => pricingSource.replace('price * (100 - percent) / 100', 'price - percent'),
        files: [],
      },
    });
    await act(() => editor.dispatchEvent(paste));
    const amount = host.querySelector<HTMLInputElement>('input[type="number"]')!;
    await act(() => setInput(amount, '2400'));
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(host.querySelector('.playground-order-total')?.textContent).toContain('12.00');
    });
    expect(host.querySelector('.playground-receipt')?.textContent).toContain(
      locale === 'zh' ? '源码改动尚未应用' : 'Source changes not applied',
    );
    const update = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === (locale === 'zh' ? '更新预览' : 'Update preview'),
    )!;
    await act(async () => update.click());
    expect(host.querySelector('.playground-order-total')?.textContent).toContain('23.50');
  },
);

it('offers Files only for file examples or actual artifacts, and keeps generated data out of saved drafts', async () => {
  const host = await mountPlayground('/#example=hello');
  const hasFiles = () =>
    host.querySelector('#playground-result-view option[value="files"]') !== null;
  expect(hasFiles()).toBe(false);
  await replaceSource(
    host,
    'import std::fs using write_text;\nwrite_text("report.txt", "memory only")?;',
  );
  const draft = localStorage.getItem('carven.playground.v3.hello');
  const run = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Run')!;
  await act(async () => run.click());
  expect(hasFiles()).toBe(true);
  expect(localStorage.getItem('carven.playground.v3.hello')).toBe(draft);
  const view = host.querySelector<HTMLSelectElement>('#playground-result-view')!;
  await act(() => {
    view.value = 'files';
    view.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(host.querySelector('[aria-label="report.txt"]')?.textContent).toBe('memory only');
  expect(host.querySelector('.playground-files-note')?.textContent).toContain(
    'Files stay in memory',
  );
  await replaceSource(host, 'println("no files");');
  expect(hasFiles()).toBe(false);
  expect(view.value).toBe('output');
  const reset = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'Reset',
  )!;
  await act(() => reset.click());
  expect(localStorage.getItem('carven.playground.v3.hello')).toBeNull();
  const example = host.querySelector<HTMLSelectElement>('#playground-example')!;
  await act(() => {
    example.value = 'workspace-report';
    example.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(hasFiles()).toBe(true);
});

it('keeps the previous output visible while rerunning the same Playground action', async () => {
  const host = await mountPlayground('/#example=hello');
  await replaceSource(host, 'println("previous output");');
  const run = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Run')!;
  await act(async () => run.click());
  const output = () => host.querySelector('.playground-result-body pre')?.textContent;
  expect(output()).toBe('previous output\n');
  const post = CompilerWorker.prototype.postMessage;
  let release!: () => void;
  vi.spyOn(CompilerWorker.prototype, 'postMessage').mockImplementation(async function (
    this: CompilerWorker,
    request,
  ) {
    if (request.action === 'run')
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    return post.call(this, request);
  });
  await act(() => run.click());
  expect(output()).toBe('previous output\n');
  await act(async () => release());
  expect(output()).toBe('previous output\n');
});

it.each(['en', 'zh'] as const)(
  'updates the %s component view from source while preserving interaction state and the last valid view',
  async (locale) => {
    const host = await mountPage(
      () => <Playground locale={locale} />,
      '/#example=component-studio',
    );
    const waitForView = async (title: string) =>
      vi.waitFor(async () => {
        await act(async () => {});
        expect(host.querySelector('.scene-heading h3')?.textContent).toBe(title);
      });
    await waitForView(locale === 'zh' ? '组件画布' : 'Component canvas');
    expect(host.querySelector('.scene-node-title')?.textContent).toBe(
      locale === 'zh' ? '当前输入' : 'Current input',
    );
    expect(host.querySelector('.scene-bar-label')?.textContent).toContain(
      locale === 'zh' ? '原值' : 'Linear',
    );
    const range = host.querySelector<HTMLInputElement>('.scene-input input')!;
    const activity = async (value: string) =>
      act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
          range,
          value,
        );
        range.dispatchEvent(new Event('input', { bubbles: true }));
      });
    await activity('80');
    const chart = host.querySelector<HTMLButtonElement>('.scene-node-bars')!;
    await act(() => chart.click());
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(host.querySelector('.scene-node-note')?.textContent).toContain(
        locale === 'zh' ? '已选中图表' : 'Chart selected',
      );
    });
    const edited = sceneSource
      .replace('Component canvas', 'A changed studio')
      .replace('组件画布', '更新后的工作台')
      .replace('columns: columns', 'columns: 1')
      .replace('value * 12', 'value * 15');
    await replaceSource(host, edited, 'scene.cv');
    await waitForView(locale === 'zh' ? '更新后的工作台' : 'A changed studio');
    expect(range.value).toBe('80');
    expect(host.querySelector('.scene-node-bars')?.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelectorAll('.scene-metric')[1]?.textContent).toMatch(/1[,，]?200/);
    const broken = edited.replace('metric(1,', 'metric("bad",');
    await replaceSource(host, broken, 'scene.cv');
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(host.querySelector('.playground-reload-error')?.textContent).toContain(
        'CV-TYPE-MISMATCH',
      );
    });
    expect(host.querySelector('.scene-heading h3')?.textContent).toBe(
      locale === 'zh' ? '更新后的工作台' : 'A changed studio',
    );
    await activity('40');
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(host.querySelector('.scene-metric')?.textContent).toBe('40');
    });
    await replaceSource(host, edited.replace('columns: 1', 'columns: 4'), 'scene.cv');
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(host.querySelector('.playground-reload-error')?.textContent).toContain(
        locale === 'zh' ? '视图未更新' : 'View not updated',
      );
    });
    expect(host.querySelector('.scene-metric')?.textContent).toBe('40');
    await replaceSource(host, edited, 'scene.cv');
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(host.querySelector('.playground-reload-error')).toBeNull();
    });
    const view = host.querySelector<HTMLSelectElement>('#playground-result-view')!;
    await act(() => {
      view.value = 'tests';
      view.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const test = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === (locale === 'zh' ? '测试' : 'Test'),
    )!;
    await act(async () => test.click());
    expect(host.querySelector('.playground-result-body')?.textContent).toContain('0 failed');
  },
);

it('keeps preview labels and controls stable during a pending drag update and publishes only the latest quote', async () => {
  const post = CompilerWorker.prototype.postMessage;
  let hold = false;
  let release!: () => void;
  let waiting = false;
  vi.spyOn(CompilerWorker.prototype, 'postMessage').mockImplementation(async function (
    this: CompilerWorker,
    request,
  ) {
    if (hold && request.action === 'call') {
      waiting = true;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    return post.call(this, request);
  });
  const host = await mountPage(() => <Playground locale="en" />, '/#example=pricing-preview');
  await vi.waitFor(async () => {
    await act(async () => {});
    expect(host.querySelector('.playground-order-total')?.textContent).toContain('9.00');
  });
  const labels = () => [
    host.querySelector('.playground-receipt p')?.textContent,
    host.querySelector('.playground-preview-contract')?.textContent,
    host.querySelector('.playground-result-header .playground-actions')?.textContent,
    host.querySelector('.playground-results > .playground-pane-footer')?.textContent,
  ];
  const previousLabels = labels();
  const range = host.querySelector<HTMLInputElement>('input[type="range"]')!;
  const drag = (percent: string) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(range, percent);
    range.dispatchEvent(new Event('input', { bubbles: true }));
  };
  try {
    hold = true;
    await act(() => drag('30'));
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(waiting).toBe(true);
    });
    expect(host.querySelector('.playground-order-total')?.textContent).toContain('9.00');
    expect(labels()).toEqual(previousLabels);
    expect(range.disabled).toBe(false);
    await act(() => drag('50'));
    expect(labels()).toEqual(previousLabels);
    hold = false;
    await act(async () => release());
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(host.querySelector('.playground-order-total')?.textContent).toContain('6.00');
    });
    expect(labels()).toEqual(previousLabels);
  } finally {
    if (hold && release) release();
  }
});
