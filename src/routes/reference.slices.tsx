import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/slices';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/slices')({
  head: () =>
    pageHead(
      articles['/reference/slices/'].title,
      articles['/reference/slices/'].description,
      '/reference/slices/',
    ),
  component: () => <Article path="/reference/slices/" html={html} />,
});
