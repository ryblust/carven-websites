// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ChapterNavigation } from '../src/components/ChapterNavigation';
import { referencePaths, type ArticlePath } from '../src/generated/manifest';
import { localeOf, localizedPath } from '../src/lib/i18n';

let root: Root | undefined;
beforeAll(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
afterEach(async () => {
  if (root) await act(() => root!.unmount());
  root = undefined;
  document.body.replaceChildren();
});

async function renderNavigation(path: ArticlePath) {
  const routeRoot = createRootRoute();
  const route = createRoute({
    getParentRoute: () => routeRoot,
    path,
    component: () => <ChapterNavigation path={path} reference />,
  });
  const router = createRouter({
    routeTree: routeRoot.addChildren([route]),
    history: createMemoryHistory({ initialEntries: [path] }),
    trailingSlash: 'always',
  });
  await router.load();
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(() => root!.render(<RouterProvider router={router} />));
  return host;
}

async function search(host: HTMLElement, value: string) {
  const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
  await act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('language reference navigation', () => {
  it.each(['en', 'zh'] as const)(
    'keeps every %s reference chapter reachable in a labeled group',
    async (locale) => {
      const path = localizedPath('/reference/', locale) as ArticlePath;
      const host = await renderNavigation(path);
      const links = [...host.querySelectorAll<HTMLAnchorElement>('.chapter-list a')];
      expect(links.map((link) => link.getAttribute('href')).sort()).toEqual(
        referencePaths.filter((item) => localeOf(item) === locale).sort(),
      );
      expect(host.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe(path);
      for (const group of host.querySelectorAll('.chapter-group')) {
        expect(group.querySelector('.chapter-group-label')?.textContent).toBeTruthy();
        expect(group.querySelector('a .chapter-icon')).not.toBeNull();
      }
    },
  );

  it.each(['en', 'zh'] as const)(
    'finds %s syntax rules by keywords and recovers from an empty result',
    async (locale) => {
      const host = await renderNavigation(localizedPath('/reference/', locale) as ArticlePath);
      for (const [query, target] of [
        ['let', 'bindings'],
        [' BREAK ', 'control'],
        ['for', 'control'],
        ['?', 'failures'],
        ['addressof', 'builtins'],
        ['validate_utf8', 'library'],
      ] as const) {
        await search(host, query);
        expect(
          host.querySelector(`a[href="${localizedPath(`/reference/${target}/`, locale)}"]`),
        ).not.toBeNull();
        expect(host.querySelector('.chapter-empty')).toBeNull();
        expect(
          [...host.querySelectorAll('.chapter-group')].every((group) => group.querySelector('a')),
        ).toBe(true);
      }
      await search(host, 'unknown-keyword-that-does-not-exist');
      expect(host.querySelector('.chapter-empty[role="status"]')).not.toBeNull();
      expect(host.querySelector('.chapter-group-label')).toBeNull();
      await search(host, '');
      expect(host.querySelectorAll('.chapter-list a')).toHaveLength(
        referencePaths.filter((item) => localeOf(item) === locale).length,
      );
    },
  );
});
