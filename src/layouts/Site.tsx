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
          <div>
            <Brand locale={locale} />
            <p>{t('C++ 的力量，从容表达。', 'The power of C++, clearly expressed.')}</p>
          </div>
          <div className="footer-links">
            <Link to={localizedPath('/philosophy/', locale)}>{t('设计哲学', 'Philosophy')}</Link>
            <Link to={localizedPath('/learn/', locale)}>{t('开始学习', 'Start learning')}</Link>
            <Link to={localizedPath('/reference/', locale)}>Reference</Link>
            <a href={repository} target="_blank" rel="noopener noreferrer">
              {t('源代码 ↗', 'Source code ↗')}
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
