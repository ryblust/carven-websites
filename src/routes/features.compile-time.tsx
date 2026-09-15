import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/features/compile-time';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/features/compile-time')({
  head: () =>
    pageHead(
      articles['/features/compile-time/'].title,
      articles['/features/compile-time/'].description,
      '/features/compile-time/',
    ),
  component: () => <Article path="/features/compile-time/" html={html} />,
});
