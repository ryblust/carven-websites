import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { UIIcon } from '../components/UIIcon';
import { DesignNavigation } from '../components/DesignNavigation';
import { ReadingLayout } from '../components/ReadingLayout';
import { designReadingGroups } from '../lib/design-readings';
import { articles } from '../generated/manifest';
import { localizedPath, translate, type Locale } from '../lib/i18n';
import { plainInlineText } from '../lib/inline-code';
import '../styles/design.css';

export default function Design({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const groups = designReadingGroups;
  const headings = [
    ...groups.map((group) => ({ level: 2, id: `design-${group.id}`, title: group.title[locale] })),
    { level: 2, id: 'design-next', title: t('开始动手', 'Start writing') },
  ];

  return (
    <ReadingLayout
      path={localizedPath('/design/', locale)}
      locale={locale}
      label={t('设计与原理', 'Design & principles')}
      home={localizedPath('/design/', locale)}
      navigation={<DesignNavigation locale={locale} />}
      navigationTitle={t('专题目录', 'Topics')}
      headings={headings}
      outlineLabel={t('阅读路线', 'Reading route')}
    >
      <div className="design-page">
        <header className="article-header">
          <p className="article-kicker">
            {t('设计与原理 · 总览', 'Design & principles · Overview')}
          </p>
          <div className="article-title-row">
            <h1>
              <span>
                {t(
                  '理解语言的选择，了解程序如何运行。',
                  'Understand the language and how programs run.',
                )}
              </span>
            </h1>
          </div>
          <p>
            {t(
              '先看类型推断、失败处理与编译期执行的设计，再沿编译流程了解内建能力、运行支持和 C++ 集成。',
              'Explore inference, failure handling, and compile-time execution, then follow compilation through built-in capabilities, runtime support, and C++ integration.',
            )}
          </p>
        </header>

        <details className="mobile-toc">
          <summary>
            {t('阅读路线', 'Reading route')}{' '}
            <span>
              {headings.length} {t('个部分', 'parts')}
            </span>
          </summary>
          <nav aria-label={t('阅读路线', 'Reading route')}>
            {headings.map((heading) => (
              <a key={heading.id} href={`#${heading.id}`}>
                {heading.title}
              </a>
            ))}
          </nav>
        </details>

        {groups.map((group) => (
          <section
            key={group.id}
            className="design-readings"
            aria-labelledby={`design-${group.id}`}
          >
            <h2 id={`design-${group.id}`} className="design-section-label">
              {group.title[locale]}
            </h2>
            <ol>
              {group.readings.map((item, index) => {
                const path = localizedPath(item.path, locale);
                const article = articles[path as keyof typeof articles];
                return (
                  <li key={item.path}>
                    <Link className="design-reading" to={path}>
                      <span className="design-number" aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h3>{article.title}</h3>
                        <p>{plainInlineText(article.description)}</p>
                        <span className="design-read">
                          {t('阅读文章', 'Read the article')} <UIIcon icon={ArrowRight} />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}

        <div className="design-next" id="design-next">
          <p>{t('想动手写一个程序？', 'Ready to write a program?')}</p>
          <Link className="text-link" to={localizedPath('/learn/first-program/', locale)}>
            {t('从第一个程序开始', 'Start with your first program')}{' '}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </ReadingLayout>
  );
}
