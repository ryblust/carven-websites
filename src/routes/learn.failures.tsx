import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/failures';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/failures')({
  head: () =>
    pageHead(
      articles['/learn/failures/'].title,
      articles['/learn/failures/'].description,
      '/learn/failures/',
    ),
  component: () => <Article path="/learn/failures/" html={html} />,
});
