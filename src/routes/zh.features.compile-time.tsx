import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/features/compile-time';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/features/compile-time')({
  head: () =>
    pageHead(
      articles['/zh/features/compile-time/'].title,
      articles['/zh/features/compile-time/'].description,
    ),
  component: () => <Article path="/zh/features/compile-time/" html={html} />,
});
