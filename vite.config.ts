import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { contentPlugin } from './scripts/content/vite.ts';
import { articles } from './src/generated/manifest.ts';
import { articleRoutes } from './src/generated/article-routes.ts';
import { siteUrl } from './src/lib/site-url.ts';
import compiler from './carven-version.json' with { type: 'json' };

const basePath = `/${(process.env.BASE_PATH || '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');
const siteOrigin = siteUrl('', '/', process.env.SITE_URL)?.replace(/\/$/, '');
const sitemapHost = siteUrl('', basePath, siteOrigin)?.replace(/\/$/, '');
const compilerRevision = readFileSync(
  new URL('./public/playground-assets/compiler-revision.txt', import.meta.url),
  'utf8',
).trim();
if (!/^[0-9a-f]{40}(?:-dirty)?$/.test(compilerRevision))
  throw new Error('Invalid packaged compiler revision. Run pnpm playground:build.');
if (!process.env.CARVEN_SOURCE_DIR && compilerRevision !== compiler.revision)
  throw new Error('Packaged compiler differs from carven-version.json. Run pnpm sync.');

export default defineConfig({
  base: basePath,
  define: {
    'import.meta.env.SITE_ORIGIN': JSON.stringify(siteOrigin ?? ''),
    'import.meta.env.COMPILER_REVISION': JSON.stringify(compilerRevision),
    'import.meta.env.CARVEN_VERSION': JSON.stringify(compiler.version),
  },
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
      pages: [
        '/',
        '/zh/',
        '/404/',
        '/zh/404/',
        '/playground/',
        '/zh/playground/',
        '/design/',
        '/zh/design/',
        ...Object.keys(articles),
      ].map((path) => ({
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
