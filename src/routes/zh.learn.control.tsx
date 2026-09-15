import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/control';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/control')({
  head: () =>
    pageHead(
      articles['/zh/learn/control/'].title,
      articles['/zh/learn/control/'].description,
      '/zh/learn/control/',
    ),
  component: () => <Article path="/zh/learn/control/" html={html} />,
});
