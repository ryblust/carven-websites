import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/control';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/control')({
  head: () =>
    pageHead(
      articles['/learn/control/'].title,
      articles['/learn/control/'].description,
      '/learn/control/',
    ),
  component: () => <Article path="/learn/control/" html={html} />,
});
