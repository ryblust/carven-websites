import { htmlToDOM, type DOMNode } from 'html-react-parser';
import { textContent } from 'domutils';
import type { ArticleDocument } from '../../src/content/schema.ts';
import type { ReferenceSearchSection } from '../../src/lib/reference-search.ts';

const symbols = (text: string) =>
  text.match(
    /CV-[A-Z0-9]+(?:-[A-Z0-9]+)+|[A-Za-z_][A-Za-z_0-9]*(?:(?:::|\.)[A-Za-z_][A-Za-z_0-9]*)*/g,
  ) ?? [];

// Use rendered text so syntax-highlighting spans do not split API spellings.
export function referenceSearchSections(html: string): ReferenceSearchSection[] {
  const sections: Array<{ id: string; title: string; symbols: Set<string> }> = [];
  let current = { id: '', title: '', symbols: new Set<string>() };
  sections.push(current);

  const visit = (nodes: readonly DOMNode[]) => {
    for (const node of nodes) {
      if (node.type !== 'tag') {
        if (node.type === 'text') {
          // Diagnostics can also appear in ordinary prose or tables.
          for (const code of node.data.match(/\bCV-[A-Z0-9]+(?:-[A-Z0-9]+)+\b/g) ?? []) {
            current.symbols.add(code);
          }
        }

        continue;
      }

      if ((node.name === 'h2' || node.name === 'h3') && node.attribs.id) {
        current = { id: node.attribs.id, title: textContent(node), symbols: new Set() };
        sections.push(current);
      }

      if (node.name === 'code') {
        for (const symbol of symbols(textContent(node))) current.symbols.add(symbol);
      } else {
        visit(node.children as DOMNode[]);
      }
    }
  };

  visit(htmlToDOM(html));

  return sections
    .filter((section) => section.symbols.size)
    .map(({ id, title, symbols }) => ({ id, title, symbols: [...symbols].join(' ') }));
}

export function referenceSearchModule(articles: readonly ArticleDocument[]) {
  const index = Object.fromEntries(
    articles
      .filter((article) => article.section === 'reference')
      .map((article) => [article.path, referenceSearchSections(article.html)]),
  );

  return [
    '// Generated from reference article HTML. Do not edit.',
    "import type { ReferenceSearchSection } from '../lib/reference-search.ts';",
    `export const referenceSearch = ${JSON.stringify(index)} satisfies Record<string, ReferenceSearchSection[]>;`,
    '',
  ].join('\n');
}
