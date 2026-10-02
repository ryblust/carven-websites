import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InlineCode } from '../src/components/InlineCode';
import { plainInlineText } from '../src/lib/inline-code';
import { pageHead } from '../src/lib/head';

describe('authored inline code in descriptions', () => {
  it('renders only explicitly marked terms and escapes their contents', () => {
    expect(renderToStaticMarkup(<InlineCode text={'用 `let` 和 `ptr<T>` 表达数据。'} />)).toBe(
      '用 <code>let</code> 和 <code>ptr&lt;T&gt;</code> 表达数据。',
    );
    expect(
      renderToStaticMarkup(
        <InlineCode text={'Let callers choose; an unmatched ` stays literal.'} />,
      ),
    ).toBe('Let callers choose; an unmatched ` stays literal.');
  });

  it('keeps search and metadata readable without code delimiters', () => {
    const description = 'Use `const fn` with `String`.';
    expect(plainInlineText(description)).toBe('Use const fn with String.');
    expect(pageHead('Constants', description).meta).toContainEqual({
      name: 'description',
      content: 'Use const fn with String.',
    });
  });
});
