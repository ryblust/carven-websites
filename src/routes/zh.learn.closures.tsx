import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/closures';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/closures')({
  head: () =>
    pageHead(
      articles['/zh/learn/closures/'].title,
      articles['/zh/learn/closures/'].description,
      '/zh/learn/closures/',
    ),
  component: () => <Article path="/zh/learn/closures/" html={html} />,
});
