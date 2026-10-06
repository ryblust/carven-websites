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
  const featuredPath = localizedPath('/internals/compiler-architecture/', locale);
  const featured = articles[featuredPath as keyof typeof articles];
  const groups = designReadingGroups.slice(1);
  const headings = [
    { level: 2, id: 'design-start', title: t('从这里开始', 'Start here') },
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
          <p className="article-kicker">{t('设计与原理', 'Design & principles')}</p>
          <div className="article-title-row">
            <h1>
              <span>
                {t(
                  '从设计到实现，读懂 Carven。',
                  'Understand Carven, from intent to implementation.',
                )}
              </span>
            </h1>
          </div>
          <p>
            {t(
              '从语法与语义分析，到 C++ 生成、运行库和原生集成。沿着一个程序的路径，理解整体架构，再展开具体的设计。',
              'From syntax and semantic analysis to C++ generation, runtime support, and native integration. Follow a program through the architecture, then explore the individual designs.',
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

        <section aria-labelledby="design-start">
          <h2 id="design-start" className="design-section-label">
            {t('从这里开始', 'Start here')}
          </h2>
          <Link className="design-featured" to={featuredPath}>
            <div>
              <span className="design-topic">{t('编译器架构', 'Compiler architecture')}</span>
              <h3>{featured.title}</h3>
              <p>{plainInlineText(featured.description)}</p>
              <span className="design-read">
                {t('走进编译器', 'Explore the compiler')} <UIIcon icon={ArrowRight} />
              </span>
            </div>
            <div className="design-native-sketch" aria-hidden="true">
              <span>main.cv</span>
              <svg viewBox="0 0 100 28">
                <path d="M4 14q42-5 90 0m-13-9 13 9-14 9" />
              </svg>
              <span>SemIR</span>
              <svg viewBox="0 0 100 28">
                <path d="M4 14q42-5 90 0m-13-9 13 9-14 9" />
              </svg>
              <span>C++</span>
              <small>{t('理解程序 · 检查契约 · 实现语义', 'Understand · Check · Realize')}</small>
            </div>
          </Link>
        </section>

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
                        <span className="design-topic">{item.topic[locale]}</span>
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
          <Link className="text-link" to={localizedPath('/learn/', locale)}>
            {t('从第一个程序开始', 'Start with your first program')}{' '}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </ReadingLayout>
  );
}
