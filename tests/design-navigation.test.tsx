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
  const links = [...host.querySelectorAll<HTMLAnchorElement>('aside[aria-label] nav a[href^="#"]')];
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    const id = decodeURIComponent(link.hash.slice(1));
    expect([...host.querySelectorAll('[id]')].some((element) => element.id === id)).toBe(true);
  }
}

describe('reading navigation', () => {
  it('connects a tutorial page to its overview and next lesson under the deployment prefix', async () => {
    const locale = 'zh';
    const basepath = '/carven-websites/';
    vi.stubEnv('BASE_URL', basepath);
    const prefix = basepath.replace(/\/$/, '');
    const path = localizedPath('/learn/first-program/', locale) as ArticlePath;
    const html = '<h2 id="details">Details</h2>';
    const host = await renderPage(path, () => <Article path={path} html={html} />, basepath);
    const chapters = host.querySelector('nav[aria-label="章节导航"]')!;
    expect(chapters.querySelector('a')?.getAttribute('href')).toBe(
      `${prefix}${localizedPath('/learn/', locale)}`,
    );
    expect(chapters.querySelector('a:last-child')?.getAttribute('href')).toBe(
      `${prefix}${localizedPath('/learn/values/', locale)}`,
    );
    expect(host.querySelector('nav[aria-label] a[aria-current="page"]')?.getAttribute('href')).toBe(
      `${prefix}${path}`,
    );
    assertOutlineTargets(host);
  });
  it('identifies the current section in both main menus', async () => {
    const locale = 'en';
    const basepath = '/';
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
      for (const label of ['Main navigation', 'Mobile navigation']) {
        const menu = host.querySelector(`nav[aria-label="${label}"]`)!;
        expect(menu).not.toBeNull();
        const design = menu.querySelector(`a[href="${prefix}${designPath}"]`);
        expect(design).not.toBeNull();
        expect(design?.getAttribute('aria-current')).toBe(current);
      }
    }
  });
  it.each([
    ['/learn/', 'Tutorial chapters'],
    ['/zh/reference/', '参考手册章节'],
    ['/internals/runtime-boundary/', 'Design topics'],
  ] as const)('selects the reading navigation for %s', async (path, label) => {
    const host = await renderPage(path, () => (
      <Article path={path} html='<h2 id="details">Details</h2>' />
    ));
    expect(host.querySelector(`nav[aria-label="${label}"]`)).not.toBeNull();
    assertOutlineTargets(host);
  });
  it.each(['en', 'zh'] as const)(
    'publishes the same %s reading routes in the sidebar and overview',
    async (locale) => {
      const path = localizedPath('/design/', locale);
      const host = await renderPage(path, () => <Design locale={locale} />);
      const nav = host.querySelector(
        `nav[aria-label="${locale === 'zh' ? '设计专题' : 'Design topics'}"]`,
      )!;
      expect(nav).not.toBeNull();
      expect(nav.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe(path);
      expect(nav.querySelector('a[href*="/learn/"], a[href*="/reference/"]')).toBeNull();
      const paths = designReadingGroups.flatMap((group) =>
        group.readings.map((item) => localizedPath(item.path, locale)),
      );
      expect(new Set(paths).size).toBe(paths.length);
      expect(
        [...nav.querySelectorAll<HTMLAnchorElement>('a')]
          .map((link) => link.getAttribute('href'))
          .sort(),
      ).toEqual([path, ...paths].sort());

      for (const destination of paths) {
        expect(articles[destination as ArticlePath]).toBeDefined();
        const chapter = nav.querySelector(`a[href="${destination}"]`)!;
        expect(chapter).not.toBeNull();
        expect(chapter.textContent?.trim()).toBeTruthy();
        expect(host.querySelector(`section a[href="${destination}"]`)).not.toBeNull();
      }

      assertOutlineTargets(host);
    },
  );
});
