import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/interop';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/interop')({
  head: () =>
    pageHead(
      articles['/reference/interop/'].title,
      articles['/reference/interop/'].description,
      '/reference/interop/',
    ),
  component: () => <Article path="/reference/interop/" html={html} />,
});
