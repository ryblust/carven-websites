import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Languages, Menu, X } from 'lucide-react';
import { UIIcon } from '../components/UIIcon';
import { ThemeToggle } from '../components/ThemeToggle';
import { DocumentSearch } from '../components/DocumentSearch';
import { Brand } from '../components/Brand';
import { GitHubIcon } from '../components/GitHubIcon';
import { localeOf, localizedPath, translate } from '../lib/i18n';
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
        viewBox="0 0 100 28"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fillRule="evenodd"
          d="M2.2 12.9 C3.3 12.2 4.8 11.7 6.8 11.4 L6.1 12.8 C4.9 13.2 3.7 13.7 2.5 14 Z M10.4 11.5 C29.5 4.4 65.5 4 98 9.2 C76.2 8.4 55 11 31.2 14.4 C24.4 15.3 17.4 15.5 11.1 14.8 L12.8 13.1 L9.3 13.7 Z M12.3 12.7 C15.6 11 20.2 10.1 25.8 9.5 C21 11.4 16.5 12.6 12.3 14 Z"
        />
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
      { label: '应用示例', english: 'Example applications', path: '/use-cases/' },
    ],
  },
  {
    label: '能力',
    english: 'Capabilities',
    links: [
      {
        label: '失败与恢复',
        english: 'Failures and recovery',
        path: '/features/failure-contracts/',
      },
      { label: '编译期执行', english: 'Compile-time execution', path: '/features/compile-time/' },
      {
        label: 'C++ 生成与集成',
        english: 'C++ generation and integration',
        path: '/features/cpp-generation/',
      },
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
    select: (location) => location.pathname,
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
          <Brand locale={locale} iconOnly />
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
              <a href={`${repository}/releases/tag/v${import.meta.env.CARVEN_VERSION}`}>
                Carven {import.meta.env.CARVEN_VERSION}
              </a>{' '}
              {t(
                'Carven 开发中，可能有不兼容变更。',
                'Carven is in development; breaking changes are possible.',
              )}
              {import.meta.env.COMPILER_REVISION && (
                <>
                  {' '}
                  <a
                    className="footer-compiler"
                    href={`${repository}/commit/${import.meta.env.COMPILER_REVISION.slice(0, 40)}`}
                    title={import.meta.env.COMPILER_REVISION}
                  >
                    {t('编译器', 'Compiler')} {import.meta.env.COMPILER_REVISION.slice(0, 8)}
                    {import.meta.env.COMPILER_REVISION.endsWith('-dirty') &&
                      t('（本地改动）', ' (local changes)')}
                  </a>
                </>
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
