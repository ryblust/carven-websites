import { InlineCode } from './InlineCode';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useHydrated, useLocation } from '@tanstack/react-router';
import { Search, X } from 'lucide-react';
import { UIIcon } from './UIIcon';
import { articles } from '../generated/manifest';
import { translate, type Locale } from '../lib/i18n';
import { searchArticles } from '../lib/document-search';
import { HighlightedText } from './HighlightedText';

export function DocumentSearch({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const results = useRef<HTMLElement>(null);
  const composing = useRef(false);
  const navigating = useRef(false);
  const id = useId();
  const [query, setQuery] = useState('');
  const ready = useHydrated();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [opened, setOpened] = useState(false);
  const [shortcut, setShortcut] = useState('Ctrl K');
  const matches = useMemo(
    () => (opened ? searchArticles(locale, query) : []),
    [locale, opened, query],
  );
  const open = useCallback(
    (focusInput = window.matchMedia('(hover: hover) and (pointer: fine)').matches) => {
      if (!dialog.current || !input.current || !closeButton.current) return;
      navigating.current = false;
      setQuery('');
      setOpened(true);
      // Choose focus before showModal so touch devices never briefly focus the input.
      input.current.autofocus = focusInput;
      closeButton.current.autofocus = !focusInput;
      dialog.current.showModal();
      (focusInput ? input.current : closeButton.current).focus({ preventScroll: true });
    },
    [],
  );
  const close = () => dialog.current?.close();
  useEffect(() => {
    if (!dialog.current?.open) return;
    // History navigation can change the page while its search dialog is open.
    // Let the layout move focus to the destination instead of the old trigger.
    navigating.current = true;
    dialog.current.close();
  }, [pathname]);
  useEffect(() => {
    setShortcut(/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K');
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        className="search-trigger"
        type="button"
        onClick={() => open()}
        disabled={!ready}
        aria-haspopup="dialog"
        aria-label={t('搜索文档', 'Search documentation')}
      >
        <UIIcon icon={Search} />
        <span>{t('搜索文档', 'Search docs')}</span>
        <kbd>{shortcut}</kbd>
      </button>
      <dialog
        ref={dialog}
        className="search-dialog"
        aria-labelledby={id}
        onKeyDown={(event) => {
          if (composing.current || event.nativeEvent.isComposing) return;
          if (event.key === 'Escape') {
            event.preventDefault();
            close();
            return;
          }
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          const links = [
            ...(results.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []),
          ];
          const focused = document.activeElement;
          const index = links.findIndex((link) => link === focused);
          const focus = (element: HTMLElement) => {
            element.focus({ preventScroll: true });
            if (links.includes(element as HTMLAnchorElement)) {
              element.scrollIntoView({ block: 'nearest' });
            }
          };
          if (event.key === 'Tab') {
            const controls = [closeButton.current, input.current, ...links].filter(
              (element): element is HTMLButtonElement | HTMLInputElement | HTMLAnchorElement =>
                element !== null,
            );
            const current = controls.findIndex((element) => element === focused);
            const next = (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
            if (controls[next]) {
              event.preventDefault();
              focus(controls[next]);
            }
          } else if (
            (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
            links.length &&
            (focused === input.current || index >= 0)
          ) {
            event.preventDefault();
            const next =
              focused === input.current
                ? event.key === 'ArrowDown'
                  ? 0
                  : links.length - 1
                : (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
            focus(links[next]!);
          } else if (event.key === 'Enter' && focused === input.current && links[0]) {
            event.preventDefault();
            links[0].click();
          }
        }}
        onClose={() => {
          setOpened(false);
          if (!navigating.current) trigger.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="search-panel">
          <div className="search-heading">
            <label id={id} htmlFor={`${id}-input`}>
              {t('搜索文档', 'Search documentation')}
            </label>
            <button
              ref={closeButton}
              className="icon-button"
              type="button"
              onClick={close}
              aria-label={t('关闭搜索', 'Close search')}
            >
              <UIIcon icon={X} />
            </button>
          </div>
          <input
            ref={input}
            id={`${id}-input`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('标题、主题或关键字，例如：let', 'Title, topic or keyword, e.g. let')}
            autoComplete="off"
            aria-describedby={`${id}-keys`}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
          />
          <p className="search-hint" role="status">
            {query.trim()
              ? t(
                  `${matches.length} 个结果`,
                  `${matches.length} ${matches.length === 1 ? 'result' : 'results'}`,
                )
              : t('浏览教程、语言参考与设计专题', 'Explore tutorials, reference and design topics')}
          </p>
          <nav
            ref={results}
            className="search-results"
            aria-label={t('搜索结果', 'Search results')}
          >
            {opened &&
              matches.map(({ path, matchedTerms }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={(event) => {
                    if (
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    navigating.current = true;
                    close();
                    document.getElementById('main')?.focus({ preventScroll: true });
                  }}
                >
                  <span className="search-section">
                    {articles[path].section === 'learn'
                      ? t('教程', 'Learn')
                      : articles[path].section === 'reference'
                        ? t('语言参考', 'Reference')
                        : articles[path].section === 'use-cases'
                          ? t('接入现有工程', 'Integration')
                          : t('设计与原理', 'Design & principles')}
                  </span>
                  <strong>
                    <HighlightedText text={articles[path].title} query={query} />
                  </strong>
                  <span className="search-description">
                    <InlineCode text={articles[path].description} highlight={query} />
                  </span>
                  {matchedTerms.length > 0 && (
                    <span className="search-match">
                      {t('匹配词：', 'Matches: ')}
                      <HighlightedText text={matchedTerms.join(' · ')} query={query} />
                    </span>
                  )}
                </Link>
              ))}
            {matches.length === 0 && (
              <p className="search-empty">
                {t(
                  '没有找到匹配的文档。试试其他标题或主题。',
                  'No matching documents. Try a different title or topic.',
                )}
              </p>
            )}
          </nav>
          <p className="search-footnote" id={`${id}-keys`}>
            {t(
              '↑↓ 选择 · Tab 切换焦点 · Enter 打开 · Esc 关闭',
              '↑↓ to select · Tab to move focus · Enter to open · Esc to close',
            )}
          </p>
        </div>
      </dialog>
    </>
  );
}
