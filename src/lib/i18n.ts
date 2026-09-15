import { articlePaths } from '../generated/manifest';

export type Locale = 'zh' | 'en';
export const localeOf = (path: string): Locale =>
  path === '/zh' || path.startsWith('/zh/') ? 'zh' : 'en';
export const unlocalizedPath = (path: string) =>
  localeOf(path) === 'zh' ? path.slice(3) || '/' : path;
const destinations = ['/', '/zh/', '/404/', '/zh/404/', ...articlePaths] as const;
export function localizedPath(path: string, locale: Locale) {
  const base = unlocalizedPath(path);
  const target = locale === 'zh' ? `/zh${base}` : base;
  return destinations.find((item) => item === target) ?? (locale === 'zh' ? '/zh/' : '/');
}
export const translate = (locale: Locale) => (zh: string, en: string) =>
  locale === 'en' ? en : zh;

export function pathWithoutBase(pathname: string, base: string) {
  const prefix = base.replace(/\/$/, '');
  return prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`))
    ? pathname.slice(prefix.length) || '/'
    : pathname;
}
