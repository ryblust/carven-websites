import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/formatting';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/formatting')({
  head: () =>
    pageHead(
      articles['/reference/formatting/'].title,
      articles['/reference/formatting/'].description,
      '/reference/formatting/',
    ),
  component: () => <Article path="/reference/formatting/" html={html} />,
});
