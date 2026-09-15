import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/cli';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/cli')({
  head: () =>
    pageHead(
      articles['/zh/reference/cli/'].title,
      articles['/zh/reference/cli/'].description,
      '/zh/reference/cli/',
    ),
  component: () => <Article path="/zh/reference/cli/" html={html} />,
});
