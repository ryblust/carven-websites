// Article descriptions support explicit single-backtick code spans, not arbitrary Markdown.
export function inlineCodeParts(text: string) {
  return text
    .split(/(`[^`\n]+`)/g)
    .filter(Boolean)
    .map((part) => ({
      code: part.startsWith('`') && part.endsWith('`') && part.length > 2,
      text:
        part.startsWith('`') && part.endsWith('`') && part.length > 2 ? part.slice(1, -1) : part,
    }));
}

export function plainInlineText(text: string) {
  return inlineCodeParts(text)
    .map((part) => part.text)
    .join('');
}
