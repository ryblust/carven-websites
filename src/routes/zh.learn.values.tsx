import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/values';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/values')({
  head: () =>
    pageHead(
      articles['/zh/learn/values/'].title,
      articles['/zh/learn/values/'].description,
      '/zh/learn/values/',
    ),
  component: () => <Article path="/zh/learn/values/" html={html} />,
});
