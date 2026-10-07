// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { InlineCode } from '../src/components/InlineCode';
import { plainInlineText } from '../src/lib/inline-code';
import { pageHead } from '../src/lib/head';

function render(node: ReactNode) {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(node);
  return host;
}

describe('authored inline code in descriptions', () => {
  it('renders only explicitly marked terms and escapes their contents', () => {
    const code = render(<InlineCode text={'用 `let` 和 `ptr<T>` 表达数据。'} />);
    expect(code.textContent).toBe('用 let 和 ptr<T> 表达数据。');
    expect([...code.querySelectorAll('code')].map((element) => element.textContent)).toEqual([
      'let',
      'ptr<T>',
    ]);
    expect(code.querySelector('t')).toBeNull();
    const plain = 'Let callers choose; an unmatched ` stays literal.';
    const unmatched = render(<InlineCode text={plain} />);
    expect(unmatched.textContent).toBe(plain);
    expect(unmatched.querySelector('code')).toBeNull();
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
