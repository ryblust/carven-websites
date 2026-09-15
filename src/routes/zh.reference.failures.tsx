import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/failures';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/failures')({
  head: () =>
    pageHead(
      articles['/zh/reference/failures/'].title,
      articles['/zh/reference/failures/'].description,
      '/zh/reference/failures/',
    ),
  component: () => <Article path="/zh/reference/failures/" html={html} />,
});
