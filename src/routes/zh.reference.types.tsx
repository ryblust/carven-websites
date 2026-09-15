import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/types';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/types')({
  head: () =>
    pageHead(
      articles['/zh/reference/types/'].title,
      articles['/zh/reference/types/'].description,
      '/zh/reference/types/',
    ),
  component: () => <Article path="/zh/reference/types/" html={html} />,
});
