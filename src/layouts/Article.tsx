import { localeOf, localizedPath, translate } from '../lib/i18n';
import { Link } from '@tanstack/react-router';
import { InlineCode } from '../components/InlineCode';
import { Sketch } from '../components/Sketch';
import { ChapterNavigation } from '../components/ChapterNavigation';
import { ArticleBody } from '../components/ArticleBody';
import { DesignNavigation } from '../components/DesignNavigation';
import { ReadingLayout } from '../components/ReadingLayout';
import { designReadingGroups } from '../lib/design-readings';
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
  const design =
    !book &&
    designReadingGroups.some((group) =>
      group.readings.some((item) => localizedPath(item.path, locale) === path),
    );
  const chapterPaths = (reference ? referencePaths : lessonPaths).filter(
    (item) => localeOf(item) === locale,
  );
  const previous = book ? chapterPaths[article.lesson - 1] : undefined;
  const next = book ? chapterPaths[article.lesson + 1] : undefined;
  const headings = articleHeadings(html);
  const label = reference
    ? t('语言参考', 'Language Reference')
    : section === 'learn'
      ? t('Carven 教程', 'Carven Tutorial')
      : design
        ? t('设计与原理', 'Design & principles')
        : t('认识 Carven', 'Discover Carven');
  const chapters = (
    <ChapterNavigation key={`${locale}-${section}`} path={path} reference={reference} />
  );
  return (
    <ReadingLayout
      path={path}
      locale={locale}
      label={label}
      home={localizedPath(reference ? '/reference/' : book ? '/learn/' : '/design/', locale)}
      navigation={book ? chapters : design ? <DesignNavigation locale={locale} /> : undefined}
      navigationTitle={design ? t('专题目录', 'Topics') : undefined}
      headings={headings}
    >
      {!book && (
        <div className="breadcrumbs">
          <Link to={localizedPath('/', locale)}>Carven</Link>
          <span aria-hidden="true">/</span>
          <Link to={localizedPath('/design/', locale)}>
            {t('设计与原理', 'Design & principles')}
          </Link>
        </div>
      )}
      <article>
        <header className="article-header">
          {book && (
            <p className="article-kicker">
              {label} · {String(article.lesson).padStart(2, '0')}
            </p>
          )}
          <div className="article-title-row">
            <h1>
              <span>{title}</span>
            </h1>
            {path.endsWith('/values/') && <Sketch kind="values" />}
          </div>
          <p>
            <InlineCode text={description} />
          </p>
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
              <span>← {t('上一章', 'Previous')}</span>
              <strong>{articles[previous].title}</strong>
            </Link>
          )}
          {next && (
            <Link className="chapter-next" to={next}>
              <span>{t('下一章', 'Next')} →</span>
              <strong>{articles[next].title}</strong>
            </Link>
          )}
        </nav>
      )}
    </ReadingLayout>
  );
}
