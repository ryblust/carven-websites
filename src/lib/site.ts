import { siteUrl } from './site-url';

export const repository = 'https://github.com/ryblust/carven';
export const sourceLink = (path: string) => `${repository}/blob/main/${path}`;
export const href = (path = '') =>
  `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
export const absoluteHref = (path: string) =>
  siteUrl(path, import.meta.env.BASE_URL, import.meta.env.SITE_ORIGIN);
