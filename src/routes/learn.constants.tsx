import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/constants';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/constants')({
  head: () =>
    pageHead(
      articles['/learn/constants/'].title,
      articles['/learn/constants/'].description,
      '/learn/constants/',
    ),
  component: () => <Article path="/learn/constants/" html={html} />,
});
