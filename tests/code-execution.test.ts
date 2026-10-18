// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enhanceCodeBlocks } from '../src/effects/code-blocks';
import { enhanceCodeExecution } from '../src/effects/code-execution';
import type { ExecutionResult } from '../src/playground/protocol';

const session = vi.hoisted(() => ({ run: vi.fn(), cancel: vi.fn() }));
vi.mock('../src/playground/client', () => ({
  ExecutionSession: class {
    run = session.run;
    cancel = session.cancel;
  },
}));

interface PendingRun {
  resolve: (result: ExecutionResult | undefined) => void;
  reject: (error: Error) => void;
}
let pending: PendingRun[];
let cleanup: (() => void) | undefined;

beforeEach(() => {
  pending = [];
  session.run
    .mockReset()
    .mockImplementation(
      () =>
        new Promise<ExecutionResult | undefined>((resolve, reject) =>
          pending.push({ resolve, reject }),
        ),
    );
  session.cancel.mockReset();
  vi.stubEnv('BASE_URL', '/docs/');
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
  vi.unstubAllEnvs();
});

function fixture(
  blocks: Array<[string, boolean]> = [
    ['cv', true],
    ['carven', true],
  ],
) {
  const root = document.createElement('article');
  for (const [language, runnable] of blocks) {
    const wrap = document.createElement('div');
    wrap.className = 'code-wrap';
    wrap.innerHTML = '<div class="code-head"></div><pre><code></code></pre>';
    const pre = wrap.querySelector('pre')!;
    pre.dataset.language = language;
    if (runnable) pre.dataset.runnable = 'true';
    const span = document.createElement('span');
    span.textContent = `println("${language} <tag>");\n\n`;
    pre.querySelector('code')!.append(span);
    root.append(wrap);
  }
  document.body.append(root);
  const removeCopy = enhanceCodeBlocks(root, () => {}, 'en');
  const removeExecution = enhanceCodeExecution(root, 'en');
  cleanup = () => {
    removeExecution();
    removeCopy();
  };
  return root;
}

const completed = (stdout: string, stderr = ''): ExecutionResult => ({
  stdout,
  stderr,
  exitCode: stderr ? 1 : 0,
  artifacts: [],
  durationMs: 1,
  truncated: false,
});
const outputs = (root: Element) =>
  [...root.querySelectorAll('[role="region"] pre')].map((pre) => pre.textContent);
const finish = async (index: number, result: ExecutionResult) => {
  pending[index]!.resolve(result);
  await Promise.resolve();
};
async function start(button: HTMLButtonElement, count: number) {
  button.click();
  await vi.waitFor(() => expect(pending).toHaveLength(count));
}

describe('running article code blocks', () => {
  it('runs only explicitly enabled Carven blocks and safely displays both streams', async () => {
    const root = fixture([
      ['cv', true],
      ['carven', true],
      ['cv', false],
      ['carven', false],
      ['cpp', true],
      ['json', true],
      ['sh', true],
    ]);
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('.run-button')];
    expect(buttons).toHaveLength(2);
    expect(
      buttons.map((button) => button.closest('.code-wrap')!.querySelector('pre')!.dataset.language),
    ).toEqual(['cv', 'carven']);
    expect(root.querySelectorAll('.copy-button')).toHaveLength(7);
    const source = root.querySelector('code')!.textContent;
    await start(buttons[0]!, 1);
    expect(session.run).toHaveBeenCalledWith(
      '/docs/playground-assets/',
      source,
      'run',
      expect.any(Function),
    );
    await finish(0, completed('<script>stdout</script>\n', '<img src=x onerror=alert(1)>\n'));
    await vi.waitFor(() =>
      expect(outputs(root)).toEqual([
        '<script>stdout</script>\n',
        '<img src=x onerror=alert(1)>\n',
      ]),
    );
    expect(root.querySelector('script, img')).toBeNull();
    expect(buttons[0]!.hasAttribute('data-running')).toBe(false);
  });

  it('cancels stopped, superseded, and disposed runs without displaying late results', async () => {
    const root = fixture();
    const [first, second] = [...root.querySelectorAll<HTMLButtonElement>('.run-button')];
    await start(first!, 1);
    first!.click();
    expect(session.cancel).toHaveBeenCalledTimes(1);
    await finish(0, completed('stopped late result'));
    expect(outputs(root)).toEqual([]);

    await start(first!, 2);
    await start(second!, 3);
    expect(session.cancel).toHaveBeenCalledTimes(2);
    expect(first!.hasAttribute('data-running')).toBe(false);
    await finish(1, completed('superseded late result'));
    expect(outputs(root)).toEqual([]);
    await finish(2, completed('current result'));
    await vi.waitFor(() => expect(outputs(root)).toEqual(['current result']));

    await start(second!, 4);
    cleanup!();
    cleanup = undefined;
    expect(session.cancel).toHaveBeenCalledTimes(3);
    await finish(3, completed('disposed late result'));
    expect(root.querySelector('.run-button, [role="region"]')).toBeNull();
    first!.click();
    second!.click();
    expect(session.run).toHaveBeenCalledTimes(4);
  });

  it('allows another run after an execution error', async () => {
    const root = fixture([['cv', true]]);
    const button = root.querySelector<HTMLButtonElement>('.run-button')!;
    await start(button, 1);
    pending[0]!.reject(new Error('worker failed'));
    await vi.waitFor(() => expect(button.hasAttribute('data-running')).toBe(false));
    expect(root.querySelector('[role="status"]')?.textContent).not.toBe('');
    await start(button, 2);
    await finish(1, completed('retried successfully'));
    await vi.waitFor(() => expect(outputs(root)).toEqual(['retried successfully']));
  });
});
