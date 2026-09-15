import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/failures';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/failures')({
  head: () =>
    pageHead(
      articles['/zh/learn/failures/'].title,
      articles['/zh/learn/failures/'].description,
      '/zh/learn/failures/',
    ),
  component: () => <Article path="/zh/learn/failures/" html={html} />,
});
