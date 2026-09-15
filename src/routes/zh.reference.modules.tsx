import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/modules';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/modules')({
  head: () =>
    pageHead(
      articles['/zh/reference/modules/'].title,
      articles['/zh/reference/modules/'].description,
      '/zh/reference/modules/',
    ),
  component: () => <Article path="/zh/reference/modules/" html={html} />,
});
