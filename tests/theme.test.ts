// @vitest-environment jsdom

import { runInNewContext } from 'node:vm';
import { assert, describe, it } from '@effect/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { observeTheme, themeScript, themeColors, type ThemePreference } from '../src/lib/theme';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  document.head.replaceChildren(meta);
});
afterEach(() => vi.unstubAllGlobals());

const browserColor = () =>
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content;
const isDarkQuery = (query: string) => query.replace(/\s+/g, '') === '(prefers-color-scheme:dark)';

describe('theme before first paint', () => {
  it.each([
    { saved: 'light', systemDark: true, expected: 'light' },
    { saved: 'dark', systemDark: false, expected: 'dark' },
    { saved: null, systemDark: true, expected: 'dark' },
    { saved: null, systemDark: false, expected: 'light' },
    { saved: 'system', systemDark: true, expected: 'dark' },
    { saved: 'system', systemDark: false, expected: 'light' },
    { saved: 'invalid', systemDark: true, expected: 'dark' },
  ])('resolves $saved with system dark = $systemDark', ({ saved, systemDark, expected }) => {
    if (saved !== null) localStorage.setItem('carven-theme', saved);
    runInNewContext(themeScript, {
      document,
      localStorage,
      matchMedia: (query: string) => ({
        matches: isDarkQuery(query) && systemDark,
      }),
    });
    assert.strictEqual(document.documentElement.dataset.theme, expected);
    assert.strictEqual(browserColor(), themeColors[expected as keyof typeof themeColors]);
  });

  it('still renders the system theme when storage access is blocked', () => {
    runInNewContext(themeScript, {
      document,
      get localStorage() {
        throw new Error('Storage blocked');
      },
      matchMedia: (query: string) => ({ matches: isDarkQuery(query) }),
    });
    assert.strictEqual(document.documentElement.dataset.theme, 'dark');
    assert.strictEqual(browserColor(), themeColors.dark);
  });
});

describe('theme preference changes', () => {
  function browser(saved: string | null = null, systemDark = false, blocked = false) {
    const media = Object.assign(new EventTarget(), { matches: systemDark });
    const window = Object.assign(new EventTarget(), {
      matchMedia: (query: string) =>
        isDarkQuery(query) ? media : Object.assign(new EventTarget(), { matches: false }),
    });
    const store = localStorage;
    if (saved !== null) store.setItem('carven-theme', saved);
    const storage = blocked
      ? {
          getItem: () => {
            throw new Error('Storage blocked');
          },
          setItem: () => {
            throw new Error('Storage blocked');
          },
        }
      : store;
    vi.stubGlobal('window', window);
    vi.stubGlobal('localStorage', storage);
    const changes: ThemePreference[] = [];
    let notifications = 0;
    window.addEventListener('carven-theme-change', () => notifications++);
    const observer = observeTheme((preference) => changes.push(preference));
    return {
      observer,
      changes,
      get saved() {
        return store.getItem('carven-theme');
      },
      get notifications() {
        return notifications;
      },
      assertTheme(theme: keyof typeof themeColors) {
        assert.strictEqual(document.documentElement.dataset.theme, theme);
        assert.strictEqual(browserColor(), themeColors[theme]);
      },
      system(dark: boolean) {
        media.matches = dark;
        media.dispatchEvent(new Event('change'));
      },
      external(value: string | null, key: string | null = 'carven-theme') {
        if (value === null) store.removeItem(key ?? 'carven-theme');
        else store.setItem(key ?? 'carven-theme', value);
        window.dispatchEvent(Object.assign(new Event('storage'), { key, storageArea: storage }));
      },
    };
  }

  it('tracks system changes in both directions without saving an override', () => {
    const page = browser();
    page.assertTheme('light');
    assert.strictEqual(page.changes.at(-1), 'system');
    const beforeDark = page.notifications;
    page.system(true);
    page.assertTheme('dark');
    assert.isAbove(page.notifications, beforeDark);
    const beforeLight = page.notifications;
    page.system(false);
    page.assertTheme('light');
    assert.isAbove(page.notifications, beforeLight);
    assert.strictEqual(page.saved, null);
    assert.strictEqual(page.changes.at(-1), 'system');
    page.observer.dispose();
  });

  it.each(['light', 'dark'] as const)(
    'restores automatic switching after a saved %s choice',
    (saved) => {
      const page = browser(saved, true);
      page.assertTheme(saved);
      page.system(false);
      page.assertTheme(saved);
      page.observer.setPreference('system');
      page.assertTheme('light');
      assert.strictEqual(page.changes.at(-1), 'system');
      assert.strictEqual(page.saved, 'system');
      page.system(true);
      page.assertTheme('dark');
      page.observer.dispose();
    },
  );

  it('keeps manual choices and allows returning to system with blocked storage', () => {
    const page = browser(null, false, true);
    page.observer.setPreference('dark');
    page.assertTheme('dark');
    assert.strictEqual(page.changes.at(-1), 'dark');
    page.system(true);
    page.system(false);
    page.assertTheme('dark');
    page.observer.setPreference('system');
    page.assertTheme('light');
    page.system(true);
    page.assertTheme('dark');
    page.observer.dispose();
  });

  it('syncs preferences from other tabs and returns to system when storage is cleared', () => {
    const page = browser(null, true);
    page.external('light', 'unrelated');
    page.assertTheme('dark');
    page.external('light');
    page.assertTheme('light');
    assert.strictEqual(page.changes.at(-1), 'light');
    page.external('system');
    page.assertTheme('dark');
    page.external('light');
    page.external(null, null);
    page.assertTheme('dark');
    page.observer.dispose();
  });

  it('removes listeners when the control unmounts', () => {
    const page = browser();
    page.observer.dispose();
    const changes = [...page.changes];
    const notifications = page.notifications;
    page.system(true);
    page.external('dark');
    page.assertTheme('light');
    assert.deepStrictEqual(page.changes, changes);
    assert.strictEqual(page.notifications, notifications);
  });
});
