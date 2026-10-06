import { observeTheme, type ThemePreference } from '../lib/theme';
import { useEffect, useRef, useState } from 'react';
import { useHydrated } from '@tanstack/react-router';
import { Monitor, Moon, Sun } from 'lucide-react';
import { UIIcon } from './UIIcon';
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
      <UIIcon icon={Monitor} className="theme-system" />
      <UIIcon icon={Sun} className="theme-sun" />
      <UIIcon icon={Moon} className="theme-moon" />
    </button>
  );
}
