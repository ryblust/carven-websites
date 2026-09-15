import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/modules';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/modules')({
  head: () =>
    pageHead(
      articles['/learn/modules/'].title,
      articles['/learn/modules/'].description,
      '/learn/modules/',
    ),
  component: () => <Article path="/learn/modules/" html={html} />,
});
