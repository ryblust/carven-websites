import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/functions';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/functions')({
  head: () =>
    pageHead(
      articles['/learn/functions/'].title,
      articles['/learn/functions/'].description,
      '/learn/functions/',
    ),
  component: () => <Article path="/learn/functions/" html={html} />,
});
