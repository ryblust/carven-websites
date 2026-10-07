import { articles, type ArticlePath } from '../generated/manifest';
import { chapterLabel } from './chapter-labels';
import { plainInlineText } from './inline-code';
import { localeOf, localizedPath, type Locale } from './i18n';
import { referenceNavigationGroups } from './reference-navigation';
import { designReadingGroups } from './design-readings';

interface SearchEntry {
  path: ArticlePath;
  visible: string;
  terms: Array<{ text: string; normalized: string }>;
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
    return [{ path, visible, terms }];
  }));
}

export function searchArticles(locale: Locale, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return searchIndex(locale).flatMap(({ path, visible, terms }) => {
    const matchedTerms =
      normalized && !visible.includes(normalized)
        ? terms
            .filter((term) => term.normalized.includes(normalized))
            .slice(0, 3)
            .map((term) => term.text)
        : [];
    return visible.includes(normalized) || matchedTerms.length ? [{ path, matchedTerms }] : [];
  });
}
