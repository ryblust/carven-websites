import { href } from './site';
import { localizedPath } from './i18n';
const siteTitle = 'Carven — The power of C++, in the palm of your hand.';
const siteDescription =
  'Carven compiles to C++20, with ownership, typed failure contracts, and compile-time computation. Keep your native libraries and toolchain.';

export function pageHead(title?: string, description = siteDescription, path?: string) {
  return {
    links: path
      ? [
          { rel: 'alternate', hrefLang: 'zh-CN', href: href(localizedPath(path, 'zh')) },
          { rel: 'alternate', hrefLang: 'en', href: href(localizedPath(path, 'en')) },
          { rel: 'alternate', hrefLang: 'x-default', href: href(localizedPath(path, 'en')) },
        ]
      : [],
    meta: [
      { title: title ? `${title} · Carven` : siteTitle },
      { name: 'description', content: description },
    ],
  };
}
