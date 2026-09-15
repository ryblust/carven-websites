import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/modules';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/modules')({
  head: () =>
    pageHead(
      articles['/zh/learn/modules/'].title,
      articles['/zh/learn/modules/'].description,
      '/zh/learn/modules/',
    ),
  component: () => <Article path="/zh/learn/modules/" html={html} />,
});
