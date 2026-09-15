import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/diagnostics';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/diagnostics')({
  head: () =>
    pageHead(
      articles['/reference/diagnostics/'].title,
      articles['/reference/diagnostics/'].description,
      '/reference/diagnostics/',
    ),
  component: () => <Article path="/reference/diagnostics/" html={html} />,
});
