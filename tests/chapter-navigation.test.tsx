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
import { lessonPaths, referencePaths, type ArticlePath } from '../src/generated/manifest';
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

async function renderNavigation(path: ArticlePath, reference = true) {
  const routeRoot = createRootRoute();
  const route = createRoute({
    getParentRoute: () => routeRoot,
    path,
    component: () => <ChapterNavigation path={path} reference={reference} />,
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

describe('chapter navigation', () => {
  it.each([
    ['en', 'learn'],
    ['zh', 'learn'],
    ['en', 'reference'],
    ['zh', 'reference'],
  ] as const)(
    'makes each %s %s chapter reachable once and marks the current page',
    async (locale, section) => {
      const path = localizedPath(`/${section}/`, locale) as ArticlePath;
      const host = await renderNavigation(path, section === 'reference');
      const navigation = host.querySelector('nav')!;
      const links = [...navigation.querySelectorAll<HTMLAnchorElement>('a')];
      const paths = links.map((link) => link.getAttribute('href'));
      const chapters = section === 'learn' ? lessonPaths : referencePaths;
      expect(paths.sort()).toEqual(chapters.filter((item) => localeOf(item) === locale).sort());
      expect(new Set(paths).size).toBe(paths.length);
      expect(links.every((link) => link.textContent?.trim())).toBe(true);
      expect(navigation.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe(path);
    },
  );
});
