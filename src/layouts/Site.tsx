import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Brand } from '../components/Brand';
import { pathWithoutBase, localeOf, localizedPath, translate } from '../lib/i18n';
import { repository } from '../lib/site';

interface Props {
  children: ReactNode;
}

const nav = [
  { label: '设计哲学', english: 'Philosophy', path: '/philosophy/', key: 'philosophy' },
  { label: '学习 Carven', english: 'Learn Carven', path: '/learn/', key: 'learn' },
  { label: 'Reference', english: 'Reference', path: '/reference/', key: 'reference' },
] as const;

const footer = [
  {
    label: '学习',
    english: 'Learn',
    links: [
      { label: '开始学习', english: 'Start learning', path: '/learn/' },
      { label: '设计哲学', english: 'Philosophy', path: '/philosophy/' },
      { label: '接入现有工程', english: 'Integrate with C++', path: '/use-cases/' },
    ],
  },
  {
    label: '能力',
    english: 'Capabilities',
    links: [
      { label: '失败契约', english: 'Failure contracts', path: '/features/failure-contracts/' },
      { label: '编译期计算', english: 'Compile-time work', path: '/features/compile-time/' },
      { label: '生成 C++', english: 'C++ generation', path: '/features/cpp-generation/' },
    ],
  },
  {
    label: 'Reference',
    english: 'Reference',
    links: [
      { label: '语言 Reference', english: 'Language reference', path: '/reference/' },
      { label: '编译器命令', english: 'Compiler commands', path: '/reference/cli/' },
      { label: '诊断代码', english: 'Diagnostic codes', path: '/reference/diagnostics/' },
    ],
  },
] as const;

export default function Site({ children }: Props) {
  const content = useRef<HTMLElement>(null);
  const pathname = useLocation({
    select: (location) => pathWithoutBase(location.pathname, import.meta.env.BASE_URL),
  });
  const hash = useLocation({ select: (location) => location.hash });
  const locale = localeOf(pathname);
  const t = translate(locale);
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current !== pathname) content.current?.focus({ preventScroll: true });
    previousPath.current = pathname;
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main">
        {t('跳到正文', 'Skip to content')}
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Brand locale={locale} />
          <nav className="desktop-nav" aria-label={t('主导航', 'Main navigation')}>
            {nav.map((item) => (
              <Link key={item.key} to={localizedPath(item.path, locale)}>
                {t(item.label, item.english)}
              </Link>
            ))}
          </nav>
          <a className="github-link" href={repository} target="_blank" rel="noopener noreferrer">
            GitHub <span aria-hidden="true">↗</span>
          </a>
          <div className="header-actions">
            <Link
              className="language-switch"
              to={localizedPath(pathname, locale === 'en' ? 'zh' : 'en')}
              hrefLang={locale === 'en' ? 'zh-CN' : 'en'}
              lang={locale === 'en' ? 'zh-CN' : 'en'}
              aria-label={t('Read this page in English', '用中文阅读本页')}
            >
              {locale === 'en' ? '中文' : 'EN'}
            </Link>
            <details
              className="mobile-nav"
              key={`${pathname}#${hash}`}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && event.currentTarget.open) {
                  event.preventDefault();
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector('summary')?.focus();
                }
              }}
            >
              <summary aria-label={t('主导航菜单', 'Main navigation menu')}>
                <svg className="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </svg>
              </summary>
              <nav aria-label={t('移动端导航', 'Mobile navigation')}>
                {nav.map((item) => (
                  <Link key={item.key} to={localizedPath(item.path, locale)}>
                    {t(item.label, item.english)}
                  </Link>
                ))}
              </nav>
            </details>
          </div>
        </div>
      </header>
      <main id="main" ref={content} tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <Brand locale={locale} />
            <p>{t('C++ 的力量，从容表达。', 'The power of C++, clearly expressed.')}</p>
            <p className="footer-note">
              {t(
                'Carven 仍在积极开发中，语言与工具可能发生不兼容的变化。',
                'Carven is under active development; language and tooling changes may break existing code.',
              )}
            </p>
          </div>
          <nav className="footer-columns" aria-label={t('页脚导航', 'Footer navigation')}>
            {footer.map((group) => (
              <div key={group.english}>
                <h2>{t(group.label, group.english)}</h2>
                <ul>
                  {group.links.map((item) => (
                    <li key={item.path}>
                      <Link to={localizedPath(item.path, locale)} activeOptions={{ exact: true }}>
                        {t(item.label, item.english)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="container footer-bottom">
          <a href={repository} target="_blank" rel="noopener noreferrer">
            {t('源代码', 'Source code')} <span aria-hidden="true">↗</span>
          </a>
          <div className="footer-languages" aria-label={t('语言', 'Language')} role="group">
            <Link
              to={localizedPath(pathname, 'en')}
              activeOptions={{ exact: true }}
              hrefLang="en"
              lang="en"
            >
              English
            </Link>
            <Link
              to={localizedPath(pathname, 'zh')}
              activeOptions={{ exact: true }}
              hrefLang="zh-CN"
              lang="zh-CN"
            >
              中文
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
