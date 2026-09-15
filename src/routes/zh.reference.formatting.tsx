import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/formatting';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/formatting')({
  head: () =>
    pageHead(
      articles['/zh/reference/formatting/'].title,
      articles['/zh/reference/formatting/'].description,
    ),
  component: () => <Article path="/zh/reference/formatting/" html={html} />,
});
