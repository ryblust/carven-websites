// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentSearch } from '../src/components/DocumentSearch';

let root: Root | undefined;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  // jsdom has no native modal behavior or page layout.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(async () => {
  if (root) await act(() => root!.unmount());
  root = undefined;
  document.body.replaceChildren();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function openSearch(query = '失败') {
  const routeRoot = createRootRoute({
    component: () => (
      <>
        <DocumentSearch locale="zh" />
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </>
    ),
  });
  const route = createRoute({
    getParentRoute: () => routeRoot,
    path: '$',
    component: () => <h1>Document</h1>,
  });
  const router = createRouter({
    routeTree: routeRoot.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ['/zh/learn/'] }),
    trailingSlash: 'always',
  });
  await router.load();
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(() => root!.render(<RouterProvider router={router} />));
  const trigger = host.querySelector<HTMLButtonElement>('.search-trigger')!;
  await act(() => trigger.click());
  const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
  await setQuery(input, query);
  return {
    host,
    router,
    input,
    trigger,
    dialog: host.querySelector('dialog')!,
    links: () => [...host.querySelectorAll<HTMLAnchorElement>('.search-results a')],
  };
}

async function setQuery(input: HTMLInputElement, value: string) {
  await act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function key(key: string, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
  await act(() => {
    document.activeElement!.dispatchEvent(event);
  });
  return event;
}

describe('search keyboard navigation', () => {
  it('uses arrows to focus and reveal results, then Enter to open the focused document', async () => {
    const { router, input, dialog, links } = await openSearch();
    expect(document.activeElement).toBe(input);
    await key('ArrowDown');
    expect(document.activeElement).toBe(links()[0]);
    await key('ArrowDown');
    const second = links()[1]!;
    expect(document.activeElement).toBe(second);
    const destination = second.getAttribute('href');
    await key('Enter');
    // jsdom does not implement the browser's native Enter activation for links.
    await act(() => second.click());
    await vi.waitFor(() => expect(router.state.location.pathname).toBe(destination));
    expect(dialog.open).toBe(false);
    expect(document.activeElement?.id).toBe('main');
  });

  it('keeps fragment navigation open and closes when the underlying document changes', async () => {
    const { router, dialog } = await openSearch();
    await act(async () => {
      await router.navigate({ hash: 'section' });
    });
    expect(dialog.open).toBe(true);
    await act(async () => {
      await router.navigate({ to: '/zh/reference/library/' });
    });
    expect(router.state.location.pathname).toBe('/zh/reference/library/');
    expect(dialog.open).toBe(false);
  });

  it('supports Tab and Shift+Tab through every result and both dialog controls', async () => {
    const { host, input, links } = await openSearch();
    const close = host.querySelector<HTMLButtonElement>('.search-heading button');
    for (const link of links()) {
      await key('Tab');
      expect(document.activeElement).toBe(link);
    }
    await key('Tab');
    expect(document.activeElement).toBe(close);
    await key('Tab');
    expect(document.activeElement).toBe(input);
    await key('Tab', { shiftKey: true });
    expect(document.activeElement).toBe(close);
    await key('Tab', { shiftKey: true });
    expect(document.activeElement).toBe(links().at(-1));
  });

  it('wraps arrow navigation and uses the updated results after editing a query', async () => {
    const { input, links } = await openSearch();
    await key('ArrowUp');
    expect(document.activeElement).toBe(links().at(-1));
    await key('ArrowDown');
    expect(document.activeElement).toBe(links()[0]);
    await key('Tab', { shiftKey: true });
    expect(document.activeElement).toBe(input);
    await setQuery(input, 'validate_utf8');
    await key('ArrowDown');
    expect(document.activeElement).toBe(links()[0]);
    expect(document.activeElement?.getAttribute('href')).toBe('/zh/reference/library/');
  });

  it('keeps empty results usable and restores trigger focus on Escape', async () => {
    const { host, input, dialog, trigger } = await openSearch('no-such-document');
    await key('ArrowDown');
    expect(document.activeElement).toBe(input);
    await key('Enter');
    expect(dialog.open).toBe(true);
    await key('Tab');
    expect(document.activeElement).toBe(host.querySelector('.search-heading button'));
    await key('Escape');
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('leaves composition keys alone and opens the first result from the input', async () => {
    const { router, input, dialog, links } = await openSearch('validate_utf8');
    await act(() =>
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })),
    );
    expect((await key('Enter')).defaultPrevented).toBe(false);
    await key('ArrowDown', { isComposing: true });
    expect(document.activeElement).toBe(input);
    expect(dialog.open).toBe(true);
    await act(() => input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
    const destination = links()[0]!.getAttribute('href');
    await key('Enter');
    await vi.waitFor(() => expect(router.state.location.pathname).toBe(destination));
    expect(dialog.open).toBe(false);
  });
});
