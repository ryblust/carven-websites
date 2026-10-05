import { plainInlineText } from '../lib/inline-code';
import { ChapterIcon } from './ChapterIcon';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { localeOf, translate } from '../lib/i18n';
import { articles, lessonPaths, referencePaths, type ArticlePath } from '../generated/manifest';
import { chapterLabel } from '../lib/chapter-labels';

export function ChapterNavigation({ path, reference }: { path: ArticlePath; reference: boolean }) {
  const locale = localeOf(path);
  const t = translate(locale);
  const [query, setQuery] = useState('');
  const paths = (reference ? referencePaths : lessonPaths).filter(
    (item) => localeOf(item) === locale,
  );
  const normalized = query.trim().toLocaleLowerCase();
  const visible = paths.filter((item) =>
    `${chapterLabel(item)} ${articles[item].title} ${plainInlineText(articles[item].description)}`
      .toLocaleLowerCase()
      .includes(normalized),
  );
  return (
    <>
      <label className="chapter-search">
        <span>{t('查找章节', 'Find a chapter')}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('标题或主题…', 'Title or topic…')}
          autoComplete="off"
        />
      </label>
      <nav
        className="chapter-list"
        aria-label={
          reference ? t('参考手册章节', 'Reference chapters') : t('教程章节', 'Tutorial chapters')
        }
      >
        {visible.map((item) => (
          <Link
            key={item}
            to={item}
            activeOptions={{ exact: true }}
            className={item === path ? 'current-chapter' : undefined}
            title={articles[item].title}
          >
            <ChapterIcon path={item} />
            <span>{chapterLabel(item)}</span>
          </Link>
        ))}
        {visible.length === 0 && (
          <p className="chapter-empty" role="status">
            {t(
              '没有匹配的章节。试试“失败”或“类型”。',
              'No chapters match. Try “failure” or “types”.',
            )}
          </p>
        )}
      </nav>
    </>
  );
}
