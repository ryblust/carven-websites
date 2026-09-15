import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/closures';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/closures')({
  head: () =>
    pageHead(
      articles['/learn/closures/'].title,
      articles['/learn/closures/'].description,
      '/learn/closures/',
    ),
  component: () => <Article path="/learn/closures/" html={html} />,
});
