import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/diagnostics';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/diagnostics')({
  head: () =>
    pageHead(
      articles['/zh/reference/diagnostics/'].title,
      articles['/zh/reference/diagnostics/'].description,
    ),
  component: () => <Article path="/zh/reference/diagnostics/" html={html} />,
});
