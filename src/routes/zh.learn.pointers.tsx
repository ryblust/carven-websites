import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/pointers';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/pointers')({
  head: () =>
    pageHead(
      articles['/zh/learn/pointers/'].title,
      articles['/zh/learn/pointers/'].description,
      '/zh/learn/pointers/',
    ),
  component: () => <Article path="/zh/learn/pointers/" html={html} />,
});
