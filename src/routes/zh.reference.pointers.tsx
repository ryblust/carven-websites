import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/pointers';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/pointers')({
  head: () =>
    pageHead(
      articles['/zh/reference/pointers/'].title,
      articles['/zh/reference/pointers/'].description,
      '/zh/reference/pointers/',
    ),
  component: () => <Article path="/zh/reference/pointers/" html={html} />,
});
