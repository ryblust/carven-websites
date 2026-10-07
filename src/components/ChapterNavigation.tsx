import { ChapterIcon } from './ChapterIcon';
import { Link } from '@tanstack/react-router';
import { localeOf, localizedPath, translate } from '../lib/i18n';
import { articles, lessonPaths, type ArticlePath } from '../generated/manifest';
import { chapterLabel } from '../lib/chapter-labels';
import { referenceNavigationGroups } from '../lib/reference-navigation';

export function ChapterNavigation({ path, reference }: { path: ArticlePath; reference: boolean }) {
  const locale = localeOf(path);
  const t = translate(locale);
  const home = localizedPath(reference ? '/reference/' : '/learn/', locale) as ArticlePath;
  const groups = reference
    ? referenceNavigationGroups(locale)
    : [
        {
          id: 'lessons',
          title: t('教程章节', 'Lessons'),
          entries: lessonPaths
            .filter((item) => localeOf(item) === locale)
            .map((item) => ({ path: item })),
        },
      ];
  return (
    <nav
      className="chapter-list"
      aria-label={
        reference ? t('参考手册章节', 'Reference chapters') : t('教程章节', 'Tutorial chapters')
      }
    >
      <div className="chapter-group chapter-overview">
        <Link to={home} activeOptions={{ exact: true }} title={articles[home].title}>
          <ChapterIcon path={home} />
          <span>{t('总览', 'Overview')}</span>
        </Link>
      </div>
      {groups.map((group) => (
        <div className="chapter-group" key={group.id}>
          {group.title && <p className="chapter-group-label">{group.title}</p>}
          {group.entries
            .filter(({ path: item }) => item !== home)
            .map(({ path: item }) => (
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
    </nav>
  );
}
