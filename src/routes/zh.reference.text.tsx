import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/text';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/text')({
  head: () =>
    pageHead(
      articles['/zh/reference/text/'].title,
      articles['/zh/reference/text/'].description,
      '/zh/reference/text/',
    ),
  component: () => <Article path="/zh/reference/text/" html={html} />,
});
