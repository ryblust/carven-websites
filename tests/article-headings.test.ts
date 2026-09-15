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
});
