import { useLayoutEffect, useRef } from 'react';
import { matchCodeTokens } from '../lib/code-motion';

interface Token {
  text: string;
  node: HTMLElement;
  x: number;
  y: number;
  color: string;
}

// React owns the shell; this effect owns only its highlighted code descendants.
export function MorphingCode({ html }: { html: string }) {
  const root = useRef<HTMLDivElement>(null);
  // Keep this prop object stable so React does not reset our token spans before measurement.
  const initial = useRef({ __html: html });
  const current = useRef<string | undefined>(undefined);
  const stop = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const host = root.current;
    if (!host || current.current === html) return;
    const bounds = host.getBoundingClientRect();
    const read = (): Token[] =>
      Array.from(host.querySelectorAll<HTMLElement>('code .morph-token'), (node) => {
        const rect = node.getBoundingClientRect();
        return {
          text: node.textContent ?? '',
          node,
          x: rect.left - bounds.left,
          y: rect.top - bounds.top,
          color: getComputedStyle(node).color,
        };
      });
    // Capture the currently visible positions before interrupting an earlier morph.
    const before = read();
    stop.current();
    host.innerHTML = html;
    const code = host.querySelector('code');
    if (!code) return;
    const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
    const leaves: Text[] = [];
    while (walker.nextNode()) leaves.push(walker.currentNode as Text);
    for (const leaf of leaves) {
      const fragment = document.createDocumentFragment();
      for (const text of leaf.data.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? []) {
        if (/^\s+$/.test(text)) fragment.append(document.createTextNode(text));
        else {
          const token = document.createElement('span');
          token.className = 'morph-token';
          token.textContent = text;
          fragment.append(token);
        }
      }
      leaf.replaceWith(fragment);
    }
    const changed = current.current !== undefined;
    current.current = html;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!changed || preference.matches || !Element.prototype.animate) return;

    const after = read();
    const matches = matchCodeTokens(
      before.map((t) => t.text),
      after.map((t) => t.text),
    );
    const used = new Set(matches.filter((index): index is number => index !== undefined));
    const animations: Animation[] = [];
    const overlay = document.createElement('div');
    overlay.className = 'code-morph-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    host.append(overlay);
    const timing = { duration: 700, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' };
    after.forEach((token, index) => {
      const previous = matches[index];
      const from = previous === undefined ? undefined : before[previous];
      animations.push(
        token.node.animate(
          from
            ? [
                {
                  transform: `translate(${from.x - token.x}px, ${from.y - token.y}px)`,
                  color: from.color,
                },
                { transform: 'translate(0, 0)', color: token.color },
              ]
            : [{ opacity: 0 }, { opacity: 1 }],
          timing,
        ),
      );
    });
    before.forEach((token, index) => {
      if (used.has(index)) return;
      const ghost = document.createElement('span');
      ghost.textContent = token.text;
      Object.assign(ghost.style, {
        position: 'absolute',
        left: `${token.x}px`,
        top: `${token.y}px`,
        color: token.color,
      });
      overlay.append(ghost);
      animations.push(
        ghost.animate([{ opacity: 1 }, { opacity: 0 }], { ...timing, fill: 'forwards' }),
      );
    });
    const cleanup = () => {
      animations.forEach((animation) => animation.cancel());
      overlay.remove();
      preference.removeEventListener('change', cleanup);
      window.removeEventListener('resize', cleanup);
      host.removeEventListener('scroll', cleanup, true);
    };
    stop.current = cleanup;
    preference.addEventListener('change', cleanup);
    window.addEventListener('resize', cleanup);
    host.addEventListener('scroll', cleanup, true);
    void Promise.all(animations.map((animation) => animation.finished)).then(cleanup, () => {});
  }, [html]);

  useLayoutEffect(
    () => () => {
      stop.current();
      current.current = undefined;
    },
    [],
  );

  return <div ref={root} className="why-code-block" dangerouslySetInnerHTML={initial.current} />;
}
