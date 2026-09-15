import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/formatting';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/formatting')({
  head: () =>
    pageHead(
      articles['/learn/formatting/'].title,
      articles['/learn/formatting/'].description,
      '/learn/formatting/',
    ),
  component: () => <Article path="/learn/formatting/" html={html} />,
});
