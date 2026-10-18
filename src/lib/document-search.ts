import { articles, type ArticlePath } from '../generated/manifest';
import { referenceSearch } from '../generated/reference-search';
import { symbolParts, type ReferenceSearchSection } from './reference-search';
import { chapterLabel } from './chapter-labels';
import { plainInlineText } from './inline-code';
import { localeOf, localizedPath, type Locale } from './i18n';
import { referenceNavigationGroups } from './reference-navigation';
import { designReadingGroups } from './design-readings';

interface SearchEntry {
  path: ArticlePath;
  visible: string;
  terms: Array<{ text: string; normalized: string }>;
  sections: Array<ReferenceSearchSection & { tokens: string[] }>;
}

// Published metadata is immutable. Prepare each locale once, when first searched.
const indexes: Partial<Record<Locale, SearchEntry[]>> = {};

function searchIndex(locale: Locale) {
  if (indexes[locale]) return indexes[locale];

  const keywords = new Map<ArticlePath, readonly string[]>([
    ...referenceNavigationGroups(locale).flatMap((group) =>
      group.entries.map((entry) => [entry.path, entry.keywords] as const),
    ),
    ...designReadingGroups.flatMap((group) =>
      group.readings.map(
        (entry) =>
          [
            localizedPath(entry.path, locale) as ArticlePath,
            [entry.topic[locale], group.title[locale]],
          ] as const,
      ),
    ),
  ]);

  return (indexes[locale] = (Object.keys(articles) as ArticlePath[]).flatMap((path) => {
    const article = articles[path];
    if (localeOf(path) !== locale) return [];

    const visible = `${article.title} ${plainInlineText(article.description)}`.toLocaleLowerCase();
    const terms = [...new Set([chapterLabel(path), ...(keywords.get(path) ?? [])])].map((text) => ({
      text,
      normalized: text.toLocaleLowerCase(),
    }));
    const sections = (referenceSearch[path as keyof typeof referenceSearch] ?? []).map(
      (section) => ({
        ...section,
        tokens: [...new Set(section.symbols.split(' ').flatMap(symbolParts))],
      }),
    );

    return [{ path, visible, terms, sections }];
  }));
}

export interface DocumentSearchMatch {
  path: ArticlePath;
  matchedTerms: string[];
  section?: { id: string; title: string };
}

export function searchArticles(locale: Locale, query: string): DocumentSearchMatch[] {
  const normalized = query.trim().toLocaleLowerCase();
  const parts = symbolParts(normalized);
  const topics: DocumentSearchMatch[] = [];
  const symbols: DocumentSearchMatch[] = [];

  for (const { path, visible, terms, sections } of searchIndex(locale)) {
    const matchedTerms =
      normalized && !visible.includes(normalized)
        ? terms
            .filter((term) => term.normalized.includes(normalized))
            .slice(0, 3)
            .map((term) => term.text)
        : [];

    if (visible.includes(normalized) || matchedTerms.length) {
      topics.push({ path, matchedTerms });
      continue;
    }

    const section = sections.find(
      (section) =>
        parts.length && parts.every((part) => section.tokens.some((token) => token.includes(part))),
    );
    if (section) {
      symbols.push({
        path,
        matchedTerms: section.symbols
          .split(' ')
          .filter((symbol) => symbolParts(symbol).some((part) => part.includes(parts.at(-1)!)))
          .slice(0, 3),
        section: { id: section.id, title: section.title },
      });
    }
  }

  // Keep the rule's topic ahead of incidental uses in other pages' examples.
  return [...topics, ...symbols];
}
