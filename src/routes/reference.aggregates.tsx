import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/aggregates';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/aggregates')({
  head: () =>
    pageHead(
      articles['/reference/aggregates/'].title,
      articles['/reference/aggregates/'].description,
      '/reference/aggregates/',
    ),
  component: () => <Article path="/reference/aggregates/" html={html} />,
});
