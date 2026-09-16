import { describe, expect, it } from 'vitest';
import { articleHtmlWithBase } from '../src/lib/article-html';

describe('deployment-independent article HTML', () => {
  it('prefixes authored links and images before JavaScript navigation', () => {
    const html =
      '<a href="/zh/learn/?a=1&amp;b=2#区间">Learn</a><img src="/brand/art.webp" alt="Art">';
    expect(articleHtmlWithBase(html, '/carven-websites/')).toBe(
      '<a href="/carven-websites/zh/learn/?a=1&amp;b=2#区间">Learn</a><img src="/carven-websites/brand/art.webp" alt="Art">',
    );
    expect(articleHtmlWithBase(html, '/')).toBe(html);
  });

  it('preserves external, relative and fragment URLs and escaped source examples', () => {
    const html = `<a href="https://example.com/">External</a><a href="//example.com/">CDN</a>
<a href="../values/">Relative</a><a href="#range">Fragment</a><a href="mailto:a@example.com">Mail</a>
<code>href="/learn/" &lt;a href="/learn/"&gt;</code><span data-href="/learn/">Text</span>`;
    expect(articleHtmlWithBase(html, '/docs/')).toBe(html);
  });

  it('treats an authored route that matches the base name as a route', () => {
    expect(articleHtmlWithBase("<a href='/docs/'>Docs</a>", '/docs/')).toBe(
      "<a href='/docs/docs/'>Docs</a>",
    );
  });
});
