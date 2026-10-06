// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import Design from '../src/views/Design';
import Article from '../src/layouts/Article';
import Site from '../src/layouts/Site';
import { articles, type ArticlePath } from '../src/generated/manifest';
import runtimeEnglish from '../src/generated/articles/internals/runtime-boundary';
import runtimeChinese from '../src/generated/articles/zh/internals/runtime-boundary';
import learnEnglish from '../src/generated/articles/learn/index';
import learnChinese from '../src/generated/articles/zh/learn/index';
import referenceEnglish from '../src/generated/articles/reference/index';
import referenceChinese from '../src/generated/articles/zh/reference/index';
import { designReadingGroups } from '../src/lib/design-readings';
import { localizedPath } from '../src/lib/i18n';

afterEach(() => vi.unstubAllEnvs());

async function renderPage(path: string, component: () => ReactNode, basepath = '/') {
  const root = createRootRoute();
  const route = createRoute({ getParentRoute: () => root, path, component });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: [`${basepath.replace(/\/$/, '')}${path}`] }),
    basepath,
    trailingSlash: 'always',
    isServer: true,
  });
  await router.load();
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(<RouterProvider router={router} />);
  return host;
}

function assertOutlineTargets(host: HTMLElement) {
  const links = [...host.querySelectorAll<HTMLAnchorElement>('.page-outline nav a')];
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    const id = decodeURIComponent(link.hash.slice(1));
    expect([...host.querySelectorAll('[id]')].some((element) => element.id === id)).toBe(true);
  }
}

describe('Design reading navigation', () => {
  it.each([
    ['en', '/'],
    ['zh', '/'],
    ['en', '/carven-websites/'],
    ['zh', '/carven-websites/'],
  ] as const)(
    'identifies the current %s section under %s in both main menus',
    async (locale, basepath) => {
      vi.stubEnv('BASE_URL', basepath);
      const prefix = basepath.replace(/\/$/, '');
      const designPath = localizedPath('/design/', locale);
      for (const [destination, current] of [
        ['/internals/runtime-boundary/', 'true'],
        ['/features/failure-contracts/', 'true'],
        ['/design/', 'page'],
        ['/reference/', null],
      ] as const) {
        const path = localizedPath(destination, locale);
        const host = await renderPage(
          path,
          () => (
            <Site>
              <p>Article content</p>
            </Site>
          ),
          basepath,
        );
        for (const label of locale === 'zh'
          ? ['主导航', '移动端导航']
          : ['Main navigation', 'Mobile navigation']) {
          const menu = host.querySelector(`nav[aria-label="${label}"]`)!;
          expect(menu).not.toBeNull();
          const design = menu.querySelector(`a[href="${prefix}${designPath}"]`);
          expect(design).not.toBeNull();
          expect(design?.getAttribute('aria-current')).toBe(current);
        }
      }
    },
  );
  it.each(['en', 'zh'] as const)(
    'keeps %s tutorial and reference chapters inside their own shared reading frame',
    async (locale) => {
      for (const section of ['learn', 'reference'] as const) {
        const path = localizedPath(`/${section}/`, locale) as ArticlePath;
        const html =
          section === 'learn'
            ? locale === 'zh'
              ? learnChinese
              : learnEnglish
            : locale === 'zh'
              ? referenceChinese
              : referenceEnglish;
        const host = await renderPage(path, () => <Article path={path} html={html} />);
        expect(host.querySelector('.reading-layout .book-label a')?.getAttribute('href')).toBe(
          path,
        );
        expect(host.querySelector('.article-main .article-header')).not.toBeNull();
        const chapters = [
          ...host.querySelectorAll<HTMLAnchorElement>('.desktop-chapters .chapter-list a'),
        ];
        expect(chapters.length).toBeGreaterThan(1);
        expect(chapters.every((link) => link.getAttribute('href')!.startsWith(path))).toBe(true);
        expect(chapters.some((link) => link.getAttribute('aria-current') === 'page')).toBe(true);
        assertOutlineTargets(host);
      }
    },
  );
  it.each(['en', 'zh'] as const)(
    'publishes the same %s reading routes in the sidebar and overview',
    async (locale) => {
      const path = localizedPath('/design/', locale);
      const host = await renderPage(path, () => <Design locale={locale} />);
      const nav = host.querySelector('.desktop-chapters .design-navigation')!;
      expect(host.querySelector('.book-label a[aria-current="page"]')?.getAttribute('href')).toBe(
        path,
      );
      expect(nav.querySelector('a[aria-current]')).toBeNull();
      expect(nav.querySelector('a[href*="/learn/"], a[href*="/reference/"]')).toBeNull();
      const paths = designReadingGroups.flatMap((group) =>
        group.readings.map((item) => localizedPath(item.path, locale)),
      );
      expect(new Set(paths).size).toBe(paths.length);
      expect(
        [...nav.querySelectorAll<HTMLAnchorElement>('a')]
          .map((link) => link.getAttribute('href'))
          .sort(),
      ).toEqual([...paths].sort());
      for (const destination of paths) {
        expect(articles[destination as ArticlePath]).toBeDefined();
        const chapter = nav.querySelector(`a[href="${destination}"]`)!;
        expect(chapter).not.toBeNull();
        expect(chapter.querySelector('.chapter-icon[aria-hidden="true"]')).not.toBeNull();
        expect(host.querySelector(`.article-main a[href="${destination}"]`)).not.toBeNull();
      }
      expect(nav.querySelectorAll('.chapter-group-label')).toHaveLength(designReadingGroups.length);
      expect(host.querySelector('.reading-layout .article-main .article-header')).not.toBeNull();
      assertOutlineTargets(host);
    },
  );

  it.each(['en', 'zh'] as const)(
    'keeps %s runtime navigation, section anchors and C++ syntax in published HTML',
    async (locale) => {
      const path = localizedPath('/internals/runtime-boundary/', locale) as ArticlePath;
      const html = locale === 'zh' ? runtimeChinese : runtimeEnglish;
      const host = await renderPage(path, () => <Article path={path} html={html} />);
      expect(
        host.querySelector('.desktop-chapters a[aria-current="page"]')?.getAttribute('href'),
      ).toBe(path);
      expect(host.querySelector('.mobile-chapters')).not.toBeNull();
      assertOutlineTargets(host);
      const entries = [...host.querySelectorAll('.prose table td:first-child code')].map(
        (code) => code.textContent,
      );
      expect(entries).toContain('import(cpp)');
      expect(entries).toContain('export(cpp)');
    },
  );
});
