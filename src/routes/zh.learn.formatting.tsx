import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/formatting';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/formatting')({
  head: () =>
    pageHead(
      articles['/zh/learn/formatting/'].title,
      articles['/zh/learn/formatting/'].description,
      '/zh/learn/formatting/',
    ),
  component: () => <Article path="/zh/learn/formatting/" html={html} />,
});
