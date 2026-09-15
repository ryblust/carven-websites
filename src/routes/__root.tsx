import { createRootRoute, HeadContent, Outlet, Scripts, useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import NotFound from '../views/NotFound';
import PageError from '../views/PageError';
import Site from '../layouts/Site';
import { pathWithoutBase, localeOf } from '../lib/i18n';
import { pageHead } from '../lib/head';
import '../styles/global.css';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#030304' },
      { name: 'color-scheme', content: 'dark' },
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
    <html lang={localeOf(pathname) === 'en' ? 'en' : 'zh-CN'}>
      <head>
        <HeadContent />
      </head>
      <body>
        <Site>{children}</Site>
        <Scripts />
      </body>
    </html>
  );
}
