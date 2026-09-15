import type { Locale } from '../lib/i18n';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useRouter } from '@tanstack/react-router';
import { enhanceCodeBlocks } from '../effects/code-blocks';
import { articleDestination } from '../lib/article-links';

export function ArticleBody({ html, locale = 'zh' }: { html: string; locale?: Locale }) {
  const content = useRef<HTMLDivElement>(null);
  const [status, announce] = useState('');
  const router = useRouter();
  useEffect(() => {
    if (content.current) return enhanceCodeBlocks(content.current, announce, locale);
  }, [html, locale]);

  // Preserve native link semantics while enhancing known authored article links.
  const navigate = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = event.target instanceof Element ? event.target.closest('a') : null;
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self'))
      return;
    const destination = articleDestination(
      anchor.href,
      window.location.href,
      import.meta.env.BASE_URL,
    );
    if (!destination) return;
    event.preventDefault();
    void router
      .navigate(destination)
      .catch((error) => console.error('Article navigation failed', error));
  };

  return (
    <>
      <div
        ref={content}
        className="prose"
        onClick={navigate}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>
    </>
  );
}
