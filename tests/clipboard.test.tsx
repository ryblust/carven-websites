// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CopyCodeButton from '../src/components/CopyCodeButton';
import type { Locale } from '../src/lib/i18n';

let root: Root | undefined;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});
afterEach(async () => {
  if (root) await act(() => root!.unmount());
  root = undefined;
  document.body.replaceChildren();
  window.getSelection()?.removeAllRanges();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function renderCopy(source: string, locale: Locale = 'en') {
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(() =>
    root!.render(
      <>
        <pre>{source}</pre>
        <CopyCodeButton
          source={source}
          locale={locale}
          onSelect={() => {
            const range = document.createRange();
            range.selectNodeContents(host.querySelector('pre')!);
            window.getSelection()!.removeAllRanges();
            window.getSelection()!.addRange(range);
            return true;
          }}
        />
      </>,
    ),
  );
  return host;
}

describe('copy code', () => {
  it.each([
    ['en', 'Copied', 'Copy'],
    ['zh', '已复制', '复制'],
  ] as const)(
    'copies exact source and shows %s feedback',
    async (locale, copiedLabel, initialLabel) => {
      vi.useFakeTimers();
      let copied = '';
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: async (text: string) => {
            copied = text;
          },
        },
      });
      const source = 'fn main() {\n    println("你好");\n}\n';
      const host = await renderCopy(source, locale);
      const button = host.querySelector('button')!;
      await act(async () => button.click());
      expect(copied).toBe(source);
      expect(button.textContent).toBe(copiedLabel);
      expect(host.querySelector('[role="status"]')?.textContent).toContain(
        locale === 'zh' ? '代码已复制' : 'Code copied',
      );
      await act(() => vi.runAllTimersAsync());
      expect(button.textContent).toBe(initialLabel);
    },
  );

  it('selects the source and explains manual copying when clipboard access is denied', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: async () => {
          throw new Error('Permission denied');
        },
      },
    });
    const source = 'println("hello");\n';
    const host = await renderCopy(source);
    await act(async () => host.querySelector('button')!.click());
    expect(window.getSelection()?.toString()).toBe(source);
    expect(host.querySelector('button')?.textContent).toBe('Copy manually');
    expect(host.querySelector('[role="status"]')?.textContent).toBe(
      'Code selected. Copy it manually.',
    );
  });
});
