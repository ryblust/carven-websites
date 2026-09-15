import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/utf';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/utf')({
  head: () =>
    pageHead(
      articles['/zh/reference/utf/'].title,
      articles['/zh/reference/utf/'].description,
      '/zh/reference/utf/',
    ),
  component: () => <Article path="/zh/reference/utf/" html={html} />,
});
