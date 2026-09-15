import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/slices';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/slices')({
  head: () =>
    pageHead(
      articles['/zh/reference/slices/'].title,
      articles['/zh/reference/slices/'].description,
      '/zh/reference/slices/',
    ),
  component: () => <Article path="/zh/reference/slices/" html={html} />,
});
