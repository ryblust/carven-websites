import { plainInlineText } from '../lib/inline-code';
import { ChapterIcon } from './ChapterIcon';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { localeOf, translate } from '../lib/i18n';
import { articles, lessonPaths, type ArticlePath } from '../generated/manifest';
import { chapterLabel } from '../lib/chapter-labels';
import { referenceNavigationGroups } from '../lib/reference-navigation';

export function ChapterNavigation({ path, reference }: { path: ArticlePath; reference: boolean }) {
  const locale = localeOf(path);
  const t = translate(locale);
  const [query, setQuery] = useState('');
  const groups = reference
    ? referenceNavigationGroups(locale)
    : [
        {
          id: 'lessons',
          title: '',
          entries: lessonPaths
            .filter((item) => localeOf(item) === locale)
            .map((item) => ({ path: item, keywords: [] as readonly string[] })),
        },
      ];
  const normalized = query.trim().toLocaleLowerCase();
  const visible = groups
    .map((group) => ({
      ...group,
      entries: group.entries.filter(({ path: item, keywords }) =>
        `${chapterLabel(item)} ${articles[item].title} ${plainInlineText(articles[item].description)} ${keywords.join(' ')}`
          .toLocaleLowerCase()
          .includes(normalized),
      ),
    }))
    .filter((group) => group.entries.length > 0);
  return (
    <>
      <label className="chapter-search">
        <span>{t('查找章节', 'Find a chapter')}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            reference
              ? t('关键字、语法或主题…', 'Keyword, syntax or topic…')
              : t('标题或主题…', 'Title or topic…')
          }
          autoComplete="off"
        />
      </label>
      <nav
        className="chapter-list"
        aria-label={
          reference ? t('参考手册章节', 'Reference chapters') : t('教程章节', 'Tutorial chapters')
        }
      >
        {visible.map((group) => (
          <div className="chapter-group" key={group.id}>
            {group.title && <p className="chapter-group-label">{group.title}</p>}
            {group.entries.map(({ path: item }) => (
              <Link
                key={item}
                to={item}
                activeOptions={{ exact: true }}
                title={articles[item].title}
              >
                <ChapterIcon path={item} />
                <span>{chapterLabel(item)}</span>
              </Link>
            ))}
          </div>
        ))}
        {visible.length === 0 && (
          <p className="chapter-empty" role="status">
            {t(
              '没有匹配的章节。试试“失败”“类型”或“for”。',
              'No chapters match. Try “failure”, “types” or “for”.',
            )}
          </p>
        )}
      </nav>
    </>
  );
}
