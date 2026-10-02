import { createRootRoute, HeadContent, Outlet, Scripts, useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import NotFound from '../views/NotFound';
import PageError from '../views/PageError';
import { themeScript } from '../lib/theme';
import Site from '../layouts/Site';
import { pathWithoutBase, localeOf } from '../lib/i18n';
import { pageHead } from '../lib/head';
import { href } from '../lib/site';
import '../styles/global.css';

export const Route = createRootRoute({
  head: () => ({
    links: [
      {
        rel: 'icon',
        href: href('/favicon.ico') + '?v=paper-3',
        sizes: '16x16 32x32 48x48 64x64 128x128 256x256',
      },
      {
        rel: 'icon',
        href: href('/favicon-32.png') + '?v=paper-3',
        type: 'image/png',
        sizes: '32x32',
      },
      {
        rel: 'icon',
        href: href('/favicon.svg') + '?v=paper-3',
        type: 'image/svg+xml',
        sizes: 'any',
      },
      {
        rel: 'preload',
        href: href('/fonts/nunito-latin.woff2'),
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
    ],
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#faf8f4' },
      { name: 'color-scheme', content: 'light dark' },
      ...pageHead().meta,
    ],
  }),
  shellComponent: Document,
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: PageError,
});

function Document({ children }: { children: ReactNode }) {
  const pathname = useLocation({
    select: (location) => pathWithoutBase(location.pathname, import.meta.env.BASE_URL),
  });
  return (
    <html lang={localeOf(pathname) === 'en' ? 'en' : 'zh-CN'} suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Site>{children}</Site>
        <Scripts />
      </body>
    </html>
  );
}
