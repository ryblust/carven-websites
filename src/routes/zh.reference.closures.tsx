import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/closures';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/closures')({
  head: () =>
    pageHead(
      articles['/zh/reference/closures/'].title,
      articles['/zh/reference/closures/'].description,
      '/zh/reference/closures/',
    ),
  component: () => <Article path="/zh/reference/closures/" html={html} />,
});
