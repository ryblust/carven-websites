import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/interop';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/interop')({
  head: () =>
    pageHead(
      articles['/zh/reference/interop/'].title,
      articles['/zh/reference/interop/'].description,
      '/zh/reference/interop/',
    ),
  component: () => <Article path="/zh/reference/interop/" html={html} />,
});
