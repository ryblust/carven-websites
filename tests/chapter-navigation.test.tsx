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

describe('language reference navigation', () => {
  it.each(['en', 'zh'] as const)(
    'makes every %s reference chapter reachable and identifies the overview',
    async (locale) => {
      const path = localizedPath('/reference/', locale) as ArticlePath;
      const host = await renderNavigation(path);
      const navigation = host.querySelector(
        `nav[aria-label="${locale === 'zh' ? '参考手册章节' : 'Reference chapters'}"]`,
      )!;
      expect(navigation).not.toBeNull();
      const links = [...navigation.querySelectorAll<HTMLAnchorElement>('a')];
      expect(links.map((link) => link.getAttribute('href')).sort()).toEqual(
        referencePaths.filter((item) => localeOf(item) === locale).sort(),
      );
      expect(links[0]?.textContent).toBe(locale === 'zh' ? '总览' : 'Overview');
      expect(navigation.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe(path);
      expect(links.every((link) => link.textContent?.trim())).toBe(true);
    },
  );
});
