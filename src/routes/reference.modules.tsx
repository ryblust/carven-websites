import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/modules';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/modules')({
  head: () =>
    pageHead(
      articles['/reference/modules/'].title,
      articles['/reference/modules/'].description,
      '/reference/modules/',
    ),
  component: () => <Article path="/reference/modules/" html={html} />,
});
