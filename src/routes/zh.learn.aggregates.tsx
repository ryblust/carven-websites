import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/aggregates';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/aggregates')({
  head: () =>
    pageHead(
      articles['/zh/learn/aggregates/'].title,
      articles['/zh/learn/aggregates/'].description,
      '/zh/learn/aggregates/',
    ),
  component: () => <Article path="/zh/learn/aggregates/" html={html} />,
});
