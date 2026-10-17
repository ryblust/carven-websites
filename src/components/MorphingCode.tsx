import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { CodeStep, CodeToken } from '../lib/code-tokens';

function tokenStyle(token: CodeToken): CSSProperties {
  return { ...token.htmlStyle, color: token.color };
}

function renderTokens(container: HTMLElement, step: CodeStep) {
  const nodes = new Map<number, HTMLSpanElement>();
  const fragment = document.createDocumentFragment();
  for (const [index, token] of step.tokens.entries()) {
    // Whitespace needs no box, measurement, or animation.
    if (!token.content.trim()) {
      fragment.append(document.createTextNode(token.content));
      continue;
    }
    const node = document.createElement('span');
    node.className = 'code-morph-token';
    node.textContent = token.content;
    for (const [property, value] of Object.entries(tokenStyle(token))) {
      if (value !== undefined) node.style.setProperty(property, String(value));
    }
    nodes.set(index, node);
    fragment.append(node);
  }
  container.replaceChildren(fragment);
  return nodes;
}

function visiblePositions(nodes: Map<number, HTMLSpanElement>, viewport: DOMRect) {
  const positions = new Map<number, { node: HTMLSpanElement; rect: DOMRect }>();
  for (const [key, node] of nodes) {
    const rect = node.getBoundingClientRect();
    if (
      rect.bottom > viewport.top &&
      rect.top < viewport.bottom &&
      rect.right > viewport.left &&
      rect.left < viewport.right
    ) {
      positions.set(key, { node, rect });
    }
  }
  return positions;
}

export function MorphingCode({ example, step }: { example: string; step: CodeStep }) {
  const viewport = useRef<HTMLDivElement>(null);
  const code = useRef<HTMLElement>(null);
  const current = useRef<{ example: string; step: CodeStep } | undefined>(undefined);
  const nodes = useRef(new Map<number, HTMLSpanElement>());
  const stop = useRef(() => {});
  // React owns the shell and initial HTML; the effect owns later token updates.
  const [initialContent] = useState(() =>
    step.tokens.map((token, index) =>
      !token.content.trim() ? (
        token.content
      ) : (
        <span key={index} data-token={index} className="code-morph-token" style={tokenStyle(token)}>
          {token.content}
        </span>
      ),
    ),
  );

  useLayoutEffect(() => {
    const host = viewport.current;
    const container = code.current;
    if (!host || !container) return;
    if (current.current === undefined) {
      // Reuse the prerendered DOM on hydration instead of replacing every token.
      container.querySelectorAll<HTMLSpanElement>('[data-token]').forEach((node) => {
        nodes.current.set(Number(node.dataset.token), node);
      });
      current.current = { example, step };
      return;
    }
    if (current.current.example === example && current.current.step === step) return;
    stop.current();
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animate = !preference.matches && typeof container.animate === 'function';
    const bounds = host.getBoundingClientRect();
    const before = animate ? visiblePositions(nodes.current, bounds) : undefined;
    const matches = new Map(
      (step.matches[current.current.example] ?? []).map(([from, to]) => [to, from]),
    );

    host.scrollTop = 0;
    host.scrollLeft = 0;
    nodes.current = renderTokens(container, step);
    current.current = { example, step };
    if (!animate) return;

    // Token correspondence was computed during the content build. Only layout
    // measurements and the visible animation belong in this paint-blocking effect.
    const after = visiblePositions(nodes.current, bounds);
    const animations: Animation[] = [];
    const timing = { duration: 450, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' };
    const overlay = document.createElement('div');
    overlay.className = 'code-morph-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    host.parentElement!.append(overlay);
    const hidden: HTMLSpanElement[] = [];
    const used = new Set<number>();
    for (const [key, { node, rect }] of after) {
      const sourceIndex = matches.get(key);
      const previous = sourceIndex === undefined ? undefined : before?.get(sourceIndex);
      if (previous) used.add(sourceIndex!);
      const dx = previous ? previous.rect.left - rect.left : 0;
      const dy = previous ? previous.rect.top - rect.top : 0;
      if (previous && !dx && !dy) continue;
      const ghost = node.cloneNode(true) as HTMLSpanElement;
      Object.assign(ghost.style, {
        position: 'absolute',
        left: `${rect.left - bounds.left}px`,
        top: `${rect.top - bounds.top}px`,
      });
      overlay.append(ghost);
      node.style.opacity = '0';
      hidden.push(node);
      animations.push(
        ghost.animate(
          previous
            ? [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }]
            : [{ opacity: 0 }, { opacity: 1 }],
          timing,
        ),
      );
    }

    // All moving tokens live outside the scroller, so their transforms cannot
    // enlarge its scroll area or make the scrollbars jump during a transition.
    for (const [key, { node, rect }] of before!) {
      if (used.has(key)) continue;
      const ghost = node.cloneNode(true) as HTMLSpanElement;
      Object.assign(ghost.style, {
        position: 'absolute',
        left: `${rect.left - bounds.left}px`,
        top: `${rect.top - bounds.top}px`,
      });
      overlay.append(ghost);
      animations.push(ghost.animate([{ opacity: 1 }, { opacity: 0 }], timing));
    }
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (stop.current === cleanup) stop.current = () => {};
      animations.forEach((animation) => animation.cancel());
      hidden.forEach((node) => {
        node.style.opacity = '';
      });
      overlay.remove();
      preference.removeEventListener('change', cleanup);
      window.removeEventListener('resize', cleanup);
      window.removeEventListener('carven-theme-change', cleanup);
    };
    stop.current = cleanup;
    preference.addEventListener('change', cleanup);
    window.addEventListener('resize', cleanup);
    window.addEventListener('carven-theme-change', cleanup);
    void Promise.all(animations.map((animation) => animation.finished)).then(cleanup, () => {});
  }, [example, step]);

  useLayoutEffect(() => () => stop.current(), []);
  return (
    <div className="code-morph-frame">
      <div
        ref={viewport}
        className="why-code-block"
        tabIndex={0}
        onWheel={() => stop.current()}
        onTouchStart={() => stop.current()}
        onScroll={() => stop.current()}
      >
        <pre className="shiki-magic-move-container">
          <code ref={code}>{initialContent}</code>
        </pre>
      </div>
    </div>
  );
}
