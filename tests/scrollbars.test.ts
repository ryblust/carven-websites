// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest';
import { installScrollbars } from '../src/lib/scrollbars';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
  vi.useRealTimers();
});

it('shows scroll feedback for dynamically mounted scrollers until they become idle', () => {
  vi.useFakeTimers();
  dispose = installScrollbars(document);
  const outer = document.createElement('div');
  const inner = document.createElement('pre');
  outer.append(inner);
  document.body.append(outer);
  inner.dispatchEvent(new Event('scroll'));
  expect(inner.dataset.scrolling).toBe('true');
  expect(outer.dataset.scrolling).toBeUndefined();
  inner.dispatchEvent(new Event('scroll'));
  outer.dispatchEvent(new Event('scroll'));
  expect(inner.dataset.scrolling).toBe('true');
  expect(outer.dataset.scrolling).toBe('true');
  vi.runOnlyPendingTimers();
  expect(inner.dataset.scrolling).toBeUndefined();
  expect(outer.dataset.scrolling).toBeUndefined();
});

it('removes pending state and listeners when the site unmounts', () => {
  vi.useFakeTimers();
  dispose = installScrollbars(document);
  const code = document.createElement('pre');
  document.body.append(code);
  code.dispatchEvent(new Event('scroll'));
  expect(code.dataset.scrolling).toBe('true');
  dispose();
  expect(code.dataset.scrolling).toBeUndefined();
  code.dispatchEvent(new Event('scroll'));
  expect(code.dataset.scrolling).toBeUndefined();
});
