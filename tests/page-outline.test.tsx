// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageOutline } from '../src/components/PageOutline';

let root: Root | undefined;
afterEach(async () => {
  if (root) await act(() => root!.unmount());
  root = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('responsive page outline', () => {
  it('tracks headings on desktop and stops layout work while the outline is hidden', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const media = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal('matchMedia', () => media);
    const frames = new Map<number, FrameRequestCallback>();
    let frame = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++frame, callback);
      return frame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    const flushFrames = () => {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(0);
    };
    let nextTop = window.innerHeight;
    const measure = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        return new DOMRect(0, this.id === 'next' ? nextTop : -10, 100, 20);
      });
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(() =>
      root!.render(
        <>
          <h2 id="section">Section</h2>
          <h2 id="next">Next section</h2>
          <PageOutline
            headings={[
              { level: 2, id: 'section', title: 'Section' },
              { level: 2, id: 'next', title: 'Next section' },
            ]}
            label="Contents"
            backLabel="Back"
          />
        </>,
      ),
    );
    window.dispatchEvent(new Event('scroll'));
    expect(measure).not.toHaveBeenCalled();
    await act(flushFrames);

    await act(() => {
      media.matches = true;
      media.dispatchEvent(new Event('change'));
    });
    expect(host.querySelector('[aria-current="location"]')?.getAttribute('href')).toBe('#section');
    nextTop = -20;
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    await act(flushFrames);
    expect(host.querySelector('[aria-current="location"]')?.getAttribute('href')).toBe('#next');
    window.dispatchEvent(new Event('scroll'));

    await act(() => {
      media.matches = false;
      media.dispatchEvent(new Event('change'));
    });
    measure.mockClear();
    window.dispatchEvent(new Event('scroll'));
    await act(flushFrames);
    expect(measure).not.toHaveBeenCalled();

    await act(() => {
      media.matches = true;
      media.dispatchEvent(new Event('change'));
      window.dispatchEvent(new Event('scroll'));
      root!.unmount();
    });
    root = undefined;
    measure.mockClear();
    media.dispatchEvent(new Event('change'));
    window.dispatchEvent(new Event('scroll'));
    await act(flushFrames);
    expect(measure).not.toHaveBeenCalled();
  });
});
