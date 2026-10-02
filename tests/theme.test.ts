import { runInNewContext } from 'node:vm';
import { assert, describe, it } from '@effect/vitest';
import { afterEach, vi } from 'vitest';
import { observeTheme, themeScript, themeColors, type ThemePreference } from '../src/lib/theme';

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
    const root = { dataset: {} as Record<string, string> };
    let browserColor = '';
    const querySelector = () => ({
      setAttribute: (_name: string, value: string) => {
        browserColor = value;
      },
    });
    runInNewContext(themeScript, {
      document: { documentElement: root, querySelector },
      localStorage: { getItem: () => saved },
      matchMedia: () => ({ matches: systemDark }),
    });
    assert.strictEqual(root.dataset.theme, expected);
    assert.strictEqual(browserColor, themeColors[expected as keyof typeof themeColors]);
  });

  it('still renders the system theme when storage access is blocked', () => {
    const root = { dataset: {} as Record<string, string> };
    let browserColor = '';
    const querySelector = () => ({
      setAttribute: (_name: string, value: string) => {
        browserColor = value;
      },
    });
    runInNewContext(themeScript, {
      document: { documentElement: root, querySelector },
      get localStorage() {
        throw new Error('Storage blocked');
      },
      matchMedia: () => ({ matches: true }),
    });
    assert.strictEqual(root.dataset.theme, 'dark');
    assert.strictEqual(browserColor, themeColors.dark);
  });
});

describe('theme preference changes', () => {
  afterEach(() => vi.unstubAllGlobals());

  function browser(saved: string | null = null, systemDark = false, blocked = false) {
    const media = Object.assign(new EventTarget(), { matches: systemDark });
    const window = Object.assign(new EventTarget(), { matchMedia: () => media });
    const root = { dataset: {} as Record<string, string> };
    let browserColor = '';
    const storage = {
      getItem: () => {
        if (blocked) throw new Error('Storage blocked');
        return saved;
      },
      setItem: (_key: string, value: string) => {
        if (blocked) throw new Error('Storage blocked');
        saved = value;
      },
    };
    vi.stubGlobal('window', window);
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('document', {
      documentElement: root,
      querySelector: () => ({
        setAttribute: (_name: string, value: string) => {
          browserColor = value;
        },
      }),
    });
    const changes: ThemePreference[] = [];
    let notifications = 0;
    window.addEventListener('carven-theme-change', () => notifications++);
    const observer = observeTheme((preference) => changes.push(preference));
    return {
      observer,
      changes,
      get saved() {
        return saved;
      },
      get notifications() {
        return notifications;
      },
      assertTheme(theme: keyof typeof themeColors) {
        assert.strictEqual(root.dataset.theme, theme);
        assert.strictEqual(browserColor, themeColors[theme]);
      },
      system(dark: boolean) {
        media.matches = dark;
        media.dispatchEvent(new Event('change'));
      },
      external(value: string | null, key: string | null = 'carven-theme') {
        saved = value;
        window.dispatchEvent(Object.assign(new Event('storage'), { key, storageArea: storage }));
      },
    };
  }

  it('tracks system changes in both directions without saving an override', () => {
    const page = browser();
    page.assertTheme('light');
    page.system(true);
    page.assertTheme('dark');
    page.system(false);
    page.assertTheme('light');
    assert.strictEqual(page.saved, null);
    assert.deepStrictEqual(page.changes, ['system', 'system', 'system']);
    assert.strictEqual(page.notifications, 3);
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
    page.system(true);
    page.external('dark');
    page.assertTheme('light');
    assert.deepStrictEqual(page.changes, ['system']);
    assert.strictEqual(page.notifications, 1);
  });
});
