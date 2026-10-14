// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  useLocation,
} from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Article from '../src/layouts/Article';
import { ArticleBody } from '../src/components/ArticleBody';
import type { ArticlePath } from '../src/generated/manifest';

let root: Root | undefined;
afterEach(async () => {
  if (root) await act(() => root!.unmount());
  root = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('article navigation', () => {
  it('publishes article and asset links under the deployment path before hydration', async () => {
    vi.stubEnv('BASE_URL', '/carven-websites/');
    const routeRoot = createRootRoute();
    const route = createRoute({
      getParentRoute: () => routeRoot,
      path: '/learn/first-program/',
      component: () => (
        <ArticleBody
          html={
            '<p><a href="../values/?mode=print&amp;lang=zh#示例"><code>Values</code></a><a download="guide.txt" href="/guide.txt">Download</a><a href="https://example.com/">External</a></p><img src="/brand/art.webp" alt="Art" />'
          }
        />
      ),
    });
    const router = createRouter({
      routeTree: routeRoot.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ['/carven-websites/learn/first-program/'] }),
      basepath: '/carven-websites/',
      trailingSlash: 'always',
      isServer: true,
    });
    await router.load();
    const host = document.createElement('div');
    host.innerHTML = renderToString(<RouterProvider router={router} />);
    expect(decodeURI(host.querySelector('a')!.getAttribute('href')!)).toBe(
      '/carven-websites/learn/values/?mode=print&lang=zh#示例',
    );
    expect(host.querySelector('[download]')?.getAttribute('href')).toBe(
      '/carven-websites/guide.txt',
    );
    expect(host.querySelector('a:last-child')?.getAttribute('href')).toBe('https://example.com/');
    expect(host.querySelector('img')?.getAttribute('src')).toBe('/carven-websites/brand/art.webp');
  });

  it('opens relative article links with their query and fragment through nested code text', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const routeRoot = createRootRoute();
    function Document() {
      const location = useLocation();
      return (
        <>
          <h1>{location.pathname}</h1>
          <output>
            {JSON.stringify(location.search)} · {location.hash}
          </output>
          <ArticleBody
            html={
              '<a href="../values/?mode=print#示例"><code>Read values</code></a><a href="#current-section">Current section</a><h2 id="current-section">Details</h2>'
            }
          />
        </>
      );
    }
    const route = createRoute({ getParentRoute: () => routeRoot, path: '$', component: Document });
    const router = createRouter({
      routeTree: routeRoot.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ['/docs/learn/first-program/'] }),
      basepath: '/docs/',
      trailingSlash: 'always',
    });
    await router.load();
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(() => root!.render(<RouterProvider router={router} />));
    await act(() => host.querySelector('code')!.click());
    await vi.waitFor(() => expect(host.querySelector('h1')?.textContent).toBe('/learn/values/'));
    expect(host.querySelector('output')?.textContent).toBe('{"mode":"print"} · 示例');
    await act(() => host.querySelectorAll('a')[1]!.click());
    await vi.waitFor(() =>
      expect(host.querySelector('output')?.textContent).toBe('{"mode":"print"} · current-section'),
    );
  });

  it('tracks the new article sections after navigating between articles with the same heading IDs', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.stubGlobal('matchMedia', () => Object.assign(new EventTarget(), { matches: true }));
    // jsdom has no page layout. Model old and new articles at different scroll
    // positions so retaining the previous article's elements gives the wrong section.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const top =
        this.closest('[data-article]')?.getAttribute('data-article') === 'new'
          ? -50
          : window.innerHeight;
      return new DOMRect(0, this.id === 'shared' ? -100 : top, 100, 24);
    });
    let frame = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++frame, callback);
      return frame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));

    function CurrentArticle() {
      const path = useLocation({ select: (location) => location.pathname }) as ArticlePath;
      const article = path === '/reference/control/' ? 'old' : 'new';
      return (
        <Article
          path={path}
          html={`<section data-article="${article}"><h2 id="shared">Shared section</h2><h2 id="next">Next section</h2></section>`}
        />
      );
    }
    const routeRoot = createRootRoute();
    const route = createRoute({
      getParentRoute: () => routeRoot,
      path: '$',
      component: CurrentArticle,
    });
    const router = createRouter({
      routeTree: routeRoot.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ['/reference/control/'] }),
      trailingSlash: 'always',
    });
    await router.load();
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(() => root!.render(<RouterProvider router={router} />));
    const currentSection = () =>
      host.querySelector('.page-outline a[aria-current="location"]')?.getAttribute('href');
    expect(currentSection()).toBe('#shared');

    const next = host.querySelector<HTMLAnchorElement>(
      'a.chapter-next[href="/reference/failures/"]',
    )!;
    await act(async () => {
      next.click();
      await vi.waitFor(() =>
        expect(
          host.querySelector('h2')?.closest('[data-article]')?.getAttribute('data-article'),
        ).toBe('new'),
      );
    });
    await act(() => {
      window.dispatchEvent(new Event('scroll'));
      for (const callback of frames.values()) callback(0);
      frames.clear();
    });
    expect(currentSection()).toBe('#next');
  });
});
