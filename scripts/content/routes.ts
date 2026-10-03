import type { ArticleDocument } from '../../src/content/schema.ts';

// One statically imported article per route keeps TanStack's page splitting intact.
export function articleRouteModule(article: ArticleDocument) {
  const stem = article.file.replace(/\.md$/, '');
  const routePath = article.path.replace(/\/$/, '');
  const path = JSON.stringify(article.path);
  const file = `routes/${stem.replaceAll('/', '.')}.tsx`;
  return {
    file,
    // Explicit siblings avoid file-route tokens and accidental article nesting.
    definition: { type: 'route', path: routePath, file: `../generated/${file}` },
    source: [
      '// Generated from src/content. Do not edit.',
      "import { createFileRoute } from '@tanstack/react-router';",
      "import Article from '../../layouts/Article';",
      "import { articles } from '../manifest';",
      `import html from ${JSON.stringify(`../articles/${stem}`)};`,
      "import { pageHead } from '../../lib/head';",
      '',
      `export const Route = createFileRoute(${JSON.stringify(routePath)})({`,
      `  head: () => pageHead(articles[${path}].title, articles[${path}].description, ${path}),`,
      `  component: () => <Article path=${JSON.stringify(article.path)} html={html} />,`,
      '});',
      '',
    ].join('\n'),
  };
}
