import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/ownership';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/ownership')({
  head: () =>
    pageHead(
      articles['/learn/ownership/'].title,
      articles['/learn/ownership/'].description,
      '/learn/ownership/',
    ),
  component: () => <Article path="/learn/ownership/" html={html} />,
});
