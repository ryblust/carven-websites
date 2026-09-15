import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/pointers';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/pointers')({
  head: () =>
    pageHead(
      articles['/learn/pointers/'].title,
      articles['/learn/pointers/'].description,
      '/learn/pointers/',
    ),
  component: () => <Article path="/learn/pointers/" html={html} />,
});
