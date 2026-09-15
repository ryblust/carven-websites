import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/index';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/')({
  head: () =>
    pageHead(
      articles['/zh/reference/'].title,
      articles['/zh/reference/'].description,
      '/zh/reference/',
    ),
  component: () => <Article path="/zh/reference/" html={html} />,
});
