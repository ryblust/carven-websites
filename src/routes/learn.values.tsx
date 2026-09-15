import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/values';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/values')({
  head: () =>
    pageHead(
      articles['/learn/values/'].title,
      articles['/learn/values/'].description,
      '/learn/values/',
    ),
  component: () => <Article path="/learn/values/" html={html} />,
});
