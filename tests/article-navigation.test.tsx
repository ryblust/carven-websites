// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
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
import type { ArticlePath } from '../src/generated/manifest';

let root: Root | undefined;
afterEach(async () => {
  if (root) await act(() => root!.unmount());
  root = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('article navigation', () => {
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
