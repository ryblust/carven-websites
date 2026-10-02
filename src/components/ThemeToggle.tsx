import { observeTheme, type ThemePreference } from '../lib/theme';
import { useEffect, useRef, useState } from 'react';
import { useHydrated } from '@tanstack/react-router';
import { translate, type Locale } from '../lib/i18n';

export function ThemeToggle({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const ready = useHydrated();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const observer = useRef<ReturnType<typeof observeTheme> | null>(null);
  useEffect(() => {
    const subscription = observeTheme(setPreference);
    observer.current = subscription;
    return () => {
      subscription.dispose();
      observer.current = null;
    };
  }, []);
  const labels = {
    system: t('跟随系统', 'System'),
    light: t('亮色', 'Light'),
    dark: t('暗色', 'Dark'),
  };
  const next = preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system';
  const label = t(
    `主题：${labels[preference]}；点击切换为${labels[next]}`,
    `Theme: ${labels[preference]}; switch to ${labels[next]}`,
  );
  return (
    <button
      type="button"
      disabled={!ready}
      className="theme-toggle icon-button"
      data-preference={preference}
      aria-label={label}
      title={label}
      onClick={() => observer.current?.setPreference(next)}
    >
      <svg className="theme-system" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M12 17v4m-4 0h8" />
      </svg>
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
