import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/control';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/control')({
  head: () =>
    pageHead(
      articles['/zh/reference/control/'].title,
      articles['/zh/reference/control/'].description,
      '/zh/reference/control/',
    ),
  component: () => <Article path="/zh/reference/control/" html={html} />,
});
