import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/text';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/text')({
  head: () =>
    pageHead(
      articles['/reference/text/'].title,
      articles['/reference/text/'].description,
      '/reference/text/',
    ),
  component: () => <Article path="/reference/text/" html={html} />,
});
