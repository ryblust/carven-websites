import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/control';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/control')({
  head: () =>
    pageHead(
      articles['/reference/control/'].title,
      articles['/reference/control/'].description,
      '/reference/control/',
    ),
  component: () => <Article path="/reference/control/" html={html} />,
});
