import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/utf';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/utf')({
  head: () =>
    pageHead(
      articles['/reference/utf/'].title,
      articles['/reference/utf/'].description,
      '/reference/utf/',
    ),
  component: () => <Article path="/reference/utf/" html={html} />,
});
