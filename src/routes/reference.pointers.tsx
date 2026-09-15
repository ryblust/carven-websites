import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/pointers';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/pointers')({
  head: () =>
    pageHead(
      articles['/reference/pointers/'].title,
      articles['/reference/pointers/'].description,
      '/reference/pointers/',
    ),
  component: () => <Article path="/reference/pointers/" html={html} />,
});
