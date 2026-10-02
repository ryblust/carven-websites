import { applyTheme } from '../lib/theme';
import { useEffect, useRef, useState } from 'react';
import { useHydrated } from '@tanstack/react-router';
import { translate, type Locale } from '../lib/i18n';

export function ThemeToggle({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const ready = useHydrated();
  const [dark, setDark] = useState(false);
  const sessionPreference = useRef<string | null>(null);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      let saved = sessionPreference.current;
      try {
        saved = localStorage.getItem('carven-theme');
      } catch {
        // The switch remains usable when browser storage is disabled.
      }
      const next = saved === 'dark' || (saved !== 'light' && media.matches);
      applyTheme(next ? 'dark' : 'light');
      setDark(next);
    };
    sync();
    media.addEventListener('change', sync);
    window.addEventListener('storage', sync);
    return () => {
      media.removeEventListener('change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return (
    <button
      type="button"
      disabled={!ready}
      className="theme-toggle icon-button"
      aria-label={t('暗色主题', 'Dark theme')}
      aria-pressed={dark}
      title={t('切换亮色 / 暗色主题', 'Switch light / dark theme')}
      onClick={() => {
        const next = !dark;
        sessionPreference.current = next ? 'dark' : 'light';
        applyTheme(next ? 'dark' : 'light');
        setDark(next);
        try {
          localStorage.setItem('carven-theme', next ? 'dark' : 'light');
        } catch {
          // Keep the in-memory preference for this visit.
        }
      }}
    >
      <svg className="theme-sun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="5.2" />
        <path d="M12 2.2v1.6m0 16.4v1.6M2.2 12h1.6m16.4 0h1.6M5 5l1.1 1.1m11.8 11.8L19 19M5 19l1.1-1.1M17.9 6.1 19 5" />
      </svg>
      <svg className="theme-moon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 15.5A8.8 8.8 0 0 1 8.5 4 8.9 8.9 0 1 0 20 15.5Z" />
        <path d="m17 2 .7 2.3L20 5l-2.3.7L17 8l-.7-2.3L14 5l2.3-.7Z" />
      </svg>
    </button>
  );
}
