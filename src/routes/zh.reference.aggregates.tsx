import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/aggregates';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/aggregates')({
  head: () =>
    pageHead(
      articles['/zh/reference/aggregates/'].title,
      articles['/zh/reference/aggregates/'].description,
    ),
  component: () => <Article path="/zh/reference/aggregates/" html={html} />,
});
