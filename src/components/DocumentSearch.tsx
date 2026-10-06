import { InlineCode } from './InlineCode';
import { plainInlineText } from '../lib/inline-code';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useHydrated } from '@tanstack/react-router';
import { Search, X } from 'lucide-react';
import { UIIcon } from './UIIcon';
import { articles, type ArticlePath } from '../generated/manifest';
import { localeOf, translate, type Locale } from '../lib/i18n';

export function DocumentSearch({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const navigating = useRef(false);
  const id = useId();
  const [query, setQuery] = useState('');
  const ready = useHydrated();
  const [opened, setOpened] = useState(false);
  const [shortcut, setShortcut] = useState('Ctrl K');
  const matches = (Object.keys(articles) as ArticlePath[]).filter((path) => {
    const article = articles[path];
    return (
      localeOf(path) === locale &&
      `${article.title} ${plainInlineText(article.description)}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase())
    );
  });
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
          if (event.key === 'Escape') {
            event.preventDefault();
            close();
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
            placeholder={t('输入标题或主题，例如：类型', 'Title or topic, e.g. types')}
            autoComplete="off"
          />
          <p className="search-hint" role="status">
            {query.trim()
              ? t(
                  `${matches.length} 个结果`,
                  `${matches.length} ${matches.length === 1 ? 'result' : 'results'}`,
                )
              : t('浏览教程与语言参考', 'Explore the tutorial and language reference')}
          </p>
          <nav className="search-results" aria-label={t('搜索结果', 'Search results')}>
            {opened &&
              matches.map((path) => (
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
                        : 'Carven'}
                  </span>
                  <strong>{articles[path].title}</strong>
                  <span>
                    <InlineCode text={articles[path].description} />
                  </span>
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
          <p className="search-footnote">
            {t('Tab 选择 · Enter 打开 · Esc 关闭', 'Tab to select · Enter to open · Esc to close')}
          </p>
        </div>
      </dialog>
    </>
  );
}
