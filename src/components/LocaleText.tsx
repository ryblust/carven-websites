import type { Locale } from '../lib/i18n';

/** Share one intrinsic layout box so translating a label does not move its neighbors. */
export function LocaleText({ locale, zh, en }: { locale: Locale; zh: string; en: string }) {
  return (
    <span className="locale-text">
      <span lang="zh-CN" aria-hidden={locale !== 'zh'} data-active={locale === 'zh'}>
        {zh}
      </span>
      <span lang="en" aria-hidden={locale !== 'en'} data-active={locale === 'en'}>
        {en}
      </span>
    </span>
  );
}
