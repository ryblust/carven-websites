import { runInNewContext } from 'node:vm';
import { assert, describe, it } from '@effect/vitest';
import { themeScript, themeColors } from '../src/lib/theme';

describe('theme before first paint', () => {
  it.each([
    { saved: 'light', systemDark: true, expected: 'light' },
    { saved: 'dark', systemDark: false, expected: 'dark' },
    { saved: null, systemDark: true, expected: 'dark' },
    { saved: null, systemDark: false, expected: 'light' },
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
