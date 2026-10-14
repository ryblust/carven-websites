import type { Locale } from '../lib/i18n';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Link, useLocation, useRouter } from '@tanstack/react-router';
import parse, {
  attributesToProps,
  domToReact,
  Element,
  type DOMNode,
  type HTMLReactParserOptions,
} from 'html-react-parser';
import { enhanceCodeComparisons } from '../effects/code-comparisons';
import { enhanceCodeBlocks } from '../effects/code-blocks';
import { href } from '../lib/site';

function ArticleLink({ href: reference, ...props }: ComponentProps<'a'> & { href: string }) {
  const currentHref = useLocation({ select: (location) => location.href });
  const router = useRouter();
  const url = new URL(reference, `https://carven.invalid${currentHref}`);
  if (url.origin !== 'https://carven.invalid' || props.download !== undefined)
    return (
      <a
        {...props}
        href={
          reference.startsWith('/') && !reference.startsWith('//') ? href(reference) : reference
        }
      />
    );
  return (
    <Link
      {...props}
      to={url.pathname}
      search={router.options.parseSearch!(url.search)}
      hash={decodeURIComponent(url.hash.slice(1))}
    />
  );
}

const parserOptions: HTMLReactParserOptions = {
  replace(node) {
    if (!(node instanceof Element)) return;
    if (node.name === 'a' && node.attribs.href) {
      const props = attributesToProps(node.attribs) as ComponentProps<'a'>;
      return (
        <ArticleLink {...props} href={node.attribs.href}>
          {domToReact(node.children as DOMNode[], parserOptions)}
        </ArticleLink>
      );
    }
    if (
      node.name === 'img' &&
      node.attribs.src?.startsWith('/') &&
      !node.attribs.src.startsWith('//')
    )
      return <img {...attributesToProps(node.attribs)} src={href(node.attribs.src)} />;
  },
};

export function ArticleBody({ html, locale = 'zh' }: { html: string; locale?: Locale }) {
  return <ArticleBodyContent key={`${locale}:${html}`} html={html} locale={locale} />;
}

function ArticleBodyContent({ html, locale }: { html: string; locale: Locale }) {
  const content = useRef<HTMLDivElement>(null);
  const [status, announce] = useState('');
  // Keep parsed children stable while effects enhance code blocks and comparisons.
  const [body] = useState(() => parse(html, parserOptions));
  useEffect(() => {
    if (!content.current) return;
    const removeComparisons = enhanceCodeComparisons(content.current);
    const removeCodeBlocks = enhanceCodeBlocks(content.current, announce, locale);
    return () => {
      removeCodeBlocks();
      removeComparisons();
    };
  }, [html, locale]);

  return (
    <>
      <div ref={content} className="prose">
        {body}
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>
    </>
  );
}
