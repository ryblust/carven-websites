import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/functions';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/functions')({
  head: () =>
    pageHead(
      articles['/reference/functions/'].title,
      articles['/reference/functions/'].description,
      '/reference/functions/',
    ),
  component: () => <Article path="/reference/functions/" html={html} />,
});
