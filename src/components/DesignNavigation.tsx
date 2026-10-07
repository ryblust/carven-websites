import { Link } from '@tanstack/react-router';
import { articles, type ArticlePath } from '../generated/manifest';
import { designReadingGroups } from '../lib/design-readings';
import { localizedPath, translate, type Locale } from '../lib/i18n';
import { ChapterIcon } from './ChapterIcon';

export function DesignNavigation({ locale }: { locale: Locale }) {
  const t = translate(locale);
  return (
    <nav className="chapter-list design-navigation" aria-label={t('设计专题', 'Design topics')}>
      <div className="chapter-group chapter-overview">
        <Link to={localizedPath('/design/', locale)} activeOptions={{ exact: true }}>
          <ChapterIcon path="/design/" />
          <span>{t('总览', 'Overview')}</span>
        </Link>
      </div>
      {designReadingGroups.map((group) => (
        <div className="chapter-group" key={group.id}>
          <p className="chapter-group-label">{group.title[locale]}</p>
          {group.readings.map((item) => {
            const destination = localizedPath(item.path, locale) as ArticlePath;
            return (
              <Link
                key={item.path}
                to={destination}
                activeOptions={{ exact: true }}
                title={articles[destination].title}
              >
                <ChapterIcon path={destination} />
                <span>{item.topic[locale]}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
