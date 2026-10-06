import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { MobileChapters } from './MobileChapters';
import { PageOutline } from './PageOutline';
import { translate, type Locale } from '../lib/i18n';
import type { articleHeadings } from '../lib/article-headings';

export function ReadingLayout({
  path,
  locale,
  label,
  home,
  navigation,
  navigationTitle,
  headings,
  outlineLabel,
  children,
}: {
  path: string;
  locale: Locale;
  label: string;
  home: string;
  navigation?: ReactNode;
  navigationTitle?: string;
  headings: ReturnType<typeof articleHeadings>;
  outlineLabel?: string;
  children: ReactNode;
}) {
  const t = translate(locale);
  const topics = navigationTitle ?? t('章节目录', 'Chapters');
  return (
    <div
      className={`reading-layout article-shell container${navigation ? '' : ' article-overview'}`}
    >
      {navigation && (
        <aside className="reading-nav" aria-label={label}>
          <div className="reading-nav-inner">
            <p className="book-label">
              <Link to={home} activeOptions={{ exact: true }}>
                {label}
              </Link>
            </p>
            <div className="desktop-chapters">{navigation}</div>
            <MobileChapters
              key={path}
              label={label}
              title={topics}
              closeLabel={t('关闭目录', 'Close navigation')}
            >
              {navigation}
            </MobileChapters>
          </div>
        </aside>
      )}
      <div className="article-main">{children}</div>
      <PageOutline
        key={path}
        headings={headings}
        label={outlineLabel ?? t('本页内容', 'On this page')}
        backLabel={t('回到顶部 ↑', 'Back to top ↑')}
      />
    </div>
  );
}
