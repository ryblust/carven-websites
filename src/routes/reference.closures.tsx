import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/closures';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/closures')({
  head: () =>
    pageHead(
      articles['/reference/closures/'].title,
      articles['/reference/closures/'].description,
      '/reference/closures/',
    ),
  component: () => <Article path="/reference/closures/" html={html} />,
});
