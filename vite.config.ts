import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { contentPlugin } from './scripts/content/vite.ts';
import { articles } from './src/generated/manifest.ts';

const basePath = `/${(process.env.BASE_PATH || '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');
const sitemapHost = process.env.SITE_URL
  ? `${process.env.SITE_URL.replace(/\/$/, '')}${basePath.replace(/\/$/, '')}`
  : undefined;

export default defineConfig({
  base: basePath,
  server: { host: '127.0.0.1', port: 4321, strictPort: true },
  preview: { host: '127.0.0.1', port: 4322, strictPort: true },
  plugins: [
    contentPlugin(),
    tanstackStart({
      pages: ['/', '/zh/', '/404/', '/zh/404/', ...Object.keys(articles)].map((path) => ({
        path,
        sitemap: {
          exclude: path === '/404/' || path === '/zh/404/',
          alternateRefs: sitemapHost
            ? [
                {
                  hreflang: 'en',
                  href: `${sitemapHost}${path.startsWith('/zh/') ? path.slice(3) : path}`,
                },
                {
                  hreflang: 'zh-CN',
                  href: `${sitemapHost}${path.startsWith('/zh/') ? path : `/zh${path}`}`,
                },
              ]
            : [],
        },
      })),
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
        failOnError: true,
        autoSubfolderIndex: true,
      },
      sitemap: { enabled: Boolean(process.env.SITE_URL), host: sitemapHost },
    }),
    react(),
  ],
});
