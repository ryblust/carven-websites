import { describe, it, expect } from 'vitest';
import { articleHeadings } from '../src/lib/article-headings';

describe('article outline', () => {
  it('preserves rendered anchors and extracts readable headings without code samples', () => {
    const html =
      '<h2 id="a">Read &amp; Write</h2><pre>&lt;h2 id="fake"&gt;code&lt;/h2&gt;</pre><h3 id="b"><code>ptr&lt;T&gt;</code></h3>';
    expect(articleHeadings(html)).toEqual([
      { level: 2, id: 'a', title: 'Read & Write' },
      { level: 3, id: 'b', title: 'ptr<T>' },
    ]);
  });

  it('includes only anchored section levels in document order', () => {
    expect(
      articleHeadings(
        '<h1 id="page">Page</h1><h3 id="中文">First &quot;section&quot;</h3>' +
          '<h2>Unanchored</h2><h4 id="detail">Detail</h4>' +
          '<h2 id="later"><em>Reader&#39;s</em> guide</h2>',
      ),
    ).toEqual([
      { level: 3, id: '中文', title: 'First "section"' },
      { level: 2, id: 'later', title: "Reader's guide" },
    ]);
    expect(articleHeadings('<p>No sections</p>')).toEqual([]);
  });
});
