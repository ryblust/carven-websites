import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { contentPlugin } from './scripts/content/vite.ts';
import { articles } from './src/generated/manifest.ts';
import { articleRoutes } from './src/generated/article-routes.ts';
import { siteUrl } from './src/lib/site-url.ts';

const basePath = `/${(process.env.BASE_PATH || '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');
const siteOrigin = siteUrl('', '/', process.env.SITE_URL)?.replace(/\/$/, '');
const sitemapHost = siteUrl('', basePath, siteOrigin)?.replace(/\/$/, '');

export default defineConfig({
  base: basePath,
  define: { 'import.meta.env.SITE_ORIGIN': JSON.stringify(siteOrigin ?? '') },
  server: { host: '127.0.0.1', port: 4321, strictPort: true },
  preview: { host: '127.0.0.1', port: 4322, strictPort: true },
  plugins: [
    contentPlugin(),
    tanstackStart({
      router: {
        virtualRouteConfig: {
          type: 'root',
          file: '__root.tsx',
          children: [{ type: 'physical', directory: '.', pathPrefix: '' }, ...articleRoutes],
        },
      },
      pages: ['/', '/zh/', '/404/', '/zh/404/', ...Object.keys(articles)].map((path) => ({
        path,
        sitemap: {
          exclude: path === '/404/' || path === '/zh/404/',
          alternateRefs: siteOrigin
            ? [
                {
                  hreflang: 'en',
                  href: siteUrl(
                    path.startsWith('/zh/') ? path.slice(3) : path,
                    basePath,
                    siteOrigin,
                  )!,
                },
                {
                  hreflang: 'zh-CN',
                  href: siteUrl(
                    path.startsWith('/zh/') ? path : `/zh${path}`,
                    basePath,
                    siteOrigin,
                  )!,
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
      sitemap: { enabled: Boolean(siteOrigin), host: sitemapHost },
    }),
    react(),
  ],
});
