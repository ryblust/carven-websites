import { localeOf, localizedPath, translate } from '../lib/i18n';
import { Link } from '@tanstack/react-router';
import { MobileChapters } from '../components/MobileChapters';
import { ChapterNavigation } from '../components/ChapterNavigation';
import { ArticleBody } from '../components/ArticleBody';
import { articles, lessonPaths, referencePaths, type ArticlePath } from '../generated/manifest';
import { sourceLink } from '../lib/site';
import { articleHeadings } from '../lib/article-headings';
import type { ArticleMetadata } from '../content/schema';

export default function Article({ path, html }: { path: ArticlePath; html: string }) {
  const locale = localeOf(path);
  const t = translate(locale);
  const article: ArticleMetadata = articles[path];
  const { title, description, section, source } = article;
  const reference = section === 'reference';
  const book = section === 'learn' || reference;
  const chapterPaths = (reference ? referencePaths : lessonPaths).filter(
    (item) => localeOf(item) === locale,
  );
  const previous = book ? chapterPaths[article.lesson - 1] : undefined;
  const next = book ? chapterPaths[article.lesson + 1] : undefined;
  const headings = articleHeadings(html);
  const label = reference
    ? t('语言 Reference', 'Language Reference')
    : section === 'learn'
      ? t('Carven 教程', 'Carven Tutorial')
      : t('认识 Carven', 'Discover Carven');
  const feature =
    section === 'cpp-generation' ||
    section === 'compile-time' ||
    section === 'failure-contracts' ||
    section === 'use-cases';
  const chapters = (
    <ChapterNavigation key={`${locale}-${section}`} path={path} reference={reference} />
  );
  return (
    <div className={`article-shell container${book ? '' : ' article-overview'}`}>
      {book && (
        <aside className="reading-nav" aria-label={t('书籍导航', 'Book navigation')}>
          <div className="reading-nav-inner">
            <p className="book-label">{label}</p>
            <div className="desktop-chapters">{chapters}</div>
            <MobileChapters
              key={path}
              label={label}
              title={t('章节目录', 'Chapters')}
              closeLabel={t('关闭章节目录', 'Close chapters')}
            >
              {chapters}
            </MobileChapters>
          </div>
        </aside>
      )}
      <div className="article-main">
        {!book && (
          <div className="breadcrumbs">
            <Link to={localizedPath('/', locale)}>Carven</Link>
            <span aria-hidden="true">/</span>
            {feature ? (
              <Link to={localizedPath('/', locale)} hash="why-carven">
                {t('为什么选择 Carven', 'Why Carven')}
              </Link>
            ) : (
              <span>{label}</span>
            )}
          </div>
        )}
        <article>
          <header className="article-header">
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
          <details className="mobile-toc" key={`${path}-toc`}>
            <summary>
              {t('本页内容', 'On this page')}{' '}
              <span>
                {headings.length} {t('个小节', 'sections')}
              </span>
            </summary>
            <nav aria-label={t('本页目录', 'Page contents')}>
              {headings.map((heading) => (
                <a key={heading.id} href={`#${heading.id}`}>
                  {heading.title}
                </a>
              ))}
            </nav>
          </details>
          <ArticleBody key={path} html={html} locale={locale} />
          <div className="article-source">
            <a href={sourceLink(source)} target="_blank" rel="noopener noreferrer">
              {t('源文档 ↗', 'Source document ↗')}
            </a>
          </div>
        </article>
        {book && (
          <nav className="chapter-nav" aria-label={t('章节导航', 'Chapter navigation')}>
            {previous && (
              <Link to={previous}>
                <span>{t('上一章', 'Previous')}</span>
                <strong>← {articles[previous].title}</strong>
              </Link>
            )}
            {next && (
              <Link className="chapter-next" to={next}>
                <span>{t('下一章', 'Next')}</span>
                <strong>{articles[next].title} →</strong>
              </Link>
            )}
          </nav>
        )}
      </div>
      <aside className="page-outline" aria-label={t('本页目录', 'Page contents')}>
        <div className="page-outline-inner">
          <p className="nav-group-label">{t('本页内容', 'On this page')}</p>
          <nav>
            {headings.map((heading) => (
              <a
                key={heading.id}
                className={heading.level === 3 ? 'outline-nested' : undefined}
                href={`#${heading.id}`}
              >
                {heading.title}
              </a>
            ))}
          </nav>
          <a className="back-top" href="#main">
            {t('回到顶部 ↑', 'Back to top ↑')}
          </a>
        </div>
      </aside>
    </div>
  );
}
