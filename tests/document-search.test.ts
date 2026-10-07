import { describe, expect, it } from 'vitest';
import { articlePaths } from '../src/generated/manifest';
import { searchArticles } from '../src/lib/document-search';
import { localeOf, localizedPath, type Locale } from '../src/lib/i18n';

const searchPaths = (locale: Locale, query: string) =>
  searchArticles(locale, query).map((match) => match.path);

describe('document search', () => {
  it.each(['en', 'zh'] as const)('finds %s rules and APIs by spelling', (locale) => {
    for (const [query, target] of [
      ['let', 'bindings'],
      [' BREAK ', 'control'],
      ['?', 'failures'],
      ['addressof', 'builtins'],
      ['validate_utf8', 'library'],
    ] as const) {
      const matches = searchPaths(locale, query);
      expect(matches).toContain(localizedPath(`/reference/${target}/`, locale));
      expect(matches.every((path) => localeOf(path) === locale)).toBe(true);
    }
  });

  it.each(['en', 'zh'] as const)('includes %s tutorials and design topics', (locale) => {
    expect(searchPaths(locale, locale === 'zh' ? '第一个程序' : 'first program')).toContain(
      localizedPath('/learn/first-program/', locale),
    );
    expect(searchPaths(locale, locale === 'zh' ? '语法与推断' : 'syntax')).toContain(
      localizedPath('/internals/syntax-and-inference/', locale),
    );
    expect(searchArticles(locale, 'unknown-keyword-that-does-not-exist')).toEqual([]);
    expect(searchPaths(locale, ' ')).toEqual(
      articlePaths.filter((path) => localeOf(path) === locale),
    );
  });

  it.each(['en', 'zh'] as const)(
    'explains %s matches outside the visible description',
    (locale) => {
      const match = searchArticles(locale, 'validate_utf8').find(
        (item) => item.path === localizedPath('/reference/library/', locale),
      );
      expect(match?.matchedTerms).toContain('validate_utf8');
      const visible = searchArticles(locale, 'let').find(
        (item) => item.path === localizedPath('/reference/bindings/', locale),
      );
      expect(visible?.matchedTerms).toEqual([]);
    },
  );
});
