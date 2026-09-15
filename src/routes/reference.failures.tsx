import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/failures';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/failures')({
  head: () =>
    pageHead(
      articles['/reference/failures/'].title,
      articles['/reference/failures/'].description,
      '/reference/failures/',
    ),
  component: () => <Article path="/reference/failures/" html={html} />,
});
