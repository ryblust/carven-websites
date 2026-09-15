import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/aggregates';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/aggregates')({
  head: () =>
    pageHead(
      articles['/learn/aggregates/'].title,
      articles['/learn/aggregates/'].description,
      '/learn/aggregates/',
    ),
  component: () => <Article path="/learn/aggregates/" html={html} />,
});
