import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/interop';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/interop')({
  head: () =>
    pageHead(
      articles['/zh/learn/interop/'].title,
      articles['/zh/learn/interop/'].description,
      '/zh/learn/interop/',
    ),
  component: () => <Article path="/zh/learn/interop/" html={html} />,
});
