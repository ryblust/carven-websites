import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Languages, Menu, X } from 'lucide-react';
import { UIIcon } from '../components/UIIcon';
import { ThemeToggle } from '../components/ThemeToggle';
import { DocumentSearch } from '../components/DocumentSearch';
import { Brand } from '../components/Brand';
import { GitHubIcon } from '../components/GitHubIcon';
import { pathWithoutBase, localeOf, localizedPath, translate } from '../lib/i18n';
import { repository } from '../lib/site';
import { designReadingGroups } from '../lib/design-readings';

interface Props {
  children: ReactNode;
}

function NavigationTitle({ children }: Props) {
  return (
    <span className="header-nav-title">
      {children}
      <svg
        className="header-nav-underline"
        viewBox="0 0 100 9"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M2 6 C18 2.5 30 8 48 5.2 S77 2.8 98 4.2" pathLength="100" />
      </svg>
    </span>
  );
}

const nav = [
  { label: 'Playground', english: 'Playground', path: '/playground/', key: 'playground' },
  { label: '设计与原理', english: 'Design', path: '/design/', key: 'design' },
  { label: '学习 Carven', english: 'Learn Carven', path: '/learn/', key: 'learn' },
  { label: '语言参考', english: 'Reference', path: '/reference/', key: 'reference' },
] as const;

const footer = [
  {
    label: '学习',
    english: 'Learn',
    links: [
      { label: '开始学习', english: 'Start learning', path: '/learn/' },
      { label: '设计与原理', english: 'Design & principles', path: '/design/' },
      { label: '接入现有工程', english: 'Integrate with C++', path: '/use-cases/' },
    ],
  },
  {
    label: '能力',
    english: 'Capabilities',
    links: [
      { label: '失败契约', english: 'Failure contracts', path: '/features/failure-contracts/' },
      { label: '编译期计算', english: 'Compile-time computation', path: '/features/compile-time/' },
      { label: '生成 C++', english: 'C++ generation', path: '/features/cpp-generation/' },
    ],
  },
  {
    label: '参考',
    english: 'Reference',
    links: [
      { label: '语言参考', english: 'Language reference', path: '/reference/' },
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
  const designReading = designReadingGroups.some((group) =>
    group.readings.some((item) => localizedPath(item.path, locale) === pathname),
  );
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
          <DocumentSearch key={locale} locale={locale} />
          <nav className="desktop-nav" aria-label={t('主导航', 'Main navigation')}>
            {nav.map((item) => (
              <Link
                key={item.key}
                to={localizedPath(item.path, locale)}
                inactiveProps={
                  item.key === 'design' && designReading ? { 'aria-current': 'true' } : undefined
                }
              >
                <NavigationTitle>{t(item.label, item.english)}</NavigationTitle>
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <a
              className="github-link"
              href={repository}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('GitHub 仓库（新标签页）', 'GitHub repository (opens in a new tab)')}
              title={t('在 GitHub 查看源代码', 'View source on GitHub')}
            >
              <GitHubIcon />
            </a>
            <ThemeToggle locale={locale} />
            <Link
              className="language-switch icon-button"
              to={localizedPath(pathname, locale === 'en' ? 'zh' : 'en')}
              hrefLang={locale === 'en' ? 'zh-CN' : 'en'}
              lang={locale === 'en' ? 'zh-CN' : 'en'}
              aria-label={t('Read this page in English', '用中文阅读本页')}
              title={t('切换到 English', 'Switch to 中文')}
            >
              <UIIcon icon={Languages} />
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
                <UIIcon icon={Menu} className="menu-icon menu-open" />
                <UIIcon icon={X} className="menu-icon menu-close" />
              </summary>
              <nav aria-label={t('移动端导航', 'Mobile navigation')}>
                {nav.map((item) => (
                  <Link
                    key={item.key}
                    to={localizedPath(item.path, locale)}
                    inactiveProps={
                      item.key === 'design' && designReading
                        ? { 'aria-current': 'true' }
                        : undefined
                    }
                  >
                    <NavigationTitle>{t(item.label, item.english)}</NavigationTitle>
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
                'Carven 开发中，语言与工具可能有不兼容变更。',
                'Carven is in development; breaking changes are possible.',
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
      </footer>
    </>
  );
}
