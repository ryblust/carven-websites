import { siteUrl } from './site-url';
import compiler from '../../carven-version.json' with { type: 'json' };

export const repository = 'https://github.com/ryblust/carven';
export const sourceLink = (path: string) => `${repository}/blob/${compiler.revision}/${path}`;
export const href = (path = '') =>
  `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
export const absoluteHref = (path: string) =>
  siteUrl(path, import.meta.env.BASE_URL, import.meta.env.SITE_ORIGIN);
