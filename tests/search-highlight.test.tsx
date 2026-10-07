// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { HighlightedText } from '../src/components/HighlightedText';
import { InlineCode } from '../src/components/InlineCode';

function render(node: ReactNode) {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(node);
  return host;
}
const markedText = (host: HTMLElement) =>
  [...host.querySelectorAll('mark')].map((mark) => mark.textContent);

describe('search result highlighting', () => {
  it('marks repeated matches while preserving case and surrounding text', () => {
    const english = render(<HighlightedText text="String, str and STR" query=" str " />);
    expect(english.textContent).toBe('String, str and STR');
    expect(markedText(english)).toEqual(['Str', 'str', 'STR']);
    const chinese = render(<HighlightedText text="失败处理与失败契约" query="失败" />);
    expect(chinese.textContent).toBe('失败处理与失败契约');
    expect(markedText(chinese)).toEqual(['失败', '失败']);
  });

  it.each(['C++', '?', '[T]', 'f"', '\\', '.*'])('treats %s as literal text', (query) => {
    const text = `Use ${query} here`;
    const host = render(<HighlightedText text={text} query={query} />);
    expect(host.textContent).toBe(text);
    expect(markedText(host)).toEqual([query]);
  });

  it('preserves code spans, escapes text and leaves empty searches unmarked', () => {
    const code = render(<InlineCode text="Use `let` and let." highlight="let" />);
    expect(code.textContent).toBe('Use let and let.');
    expect(code.querySelector('code')?.textContent).toBe('let');
    expect(code.querySelector('code mark')?.textContent).toBe('let');
    expect(markedText(code)).toEqual(['let', 'let']);
    const escaped = render(<HighlightedText text="<script>" query="<script>" />);
    expect(escaped.textContent).toBe('<script>');
    expect(markedText(escaped)).toEqual(['<script>']);
    expect(escaped.querySelector('script')).toBeNull();
    const empty = render(<HighlightedText text="Text" query=" " />);
    expect(empty.textContent).toBe('Text');
    expect(markedText(empty)).toEqual([]);
  });
});
