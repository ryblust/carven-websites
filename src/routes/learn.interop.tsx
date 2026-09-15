import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/interop';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/interop')({
  head: () =>
    pageHead(
      articles['/learn/interop/'].title,
      articles['/learn/interop/'].description,
      '/learn/interop/',
    ),
  component: () => <Article path="/learn/interop/" html={html} />,
});
