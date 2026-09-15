import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/functions';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/functions')({
  head: () =>
    pageHead(
      articles['/zh/reference/functions/'].title,
      articles['/zh/reference/functions/'].description,
    ),
  component: () => <Article path="/zh/reference/functions/" html={html} />,
});
