import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/cli';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/cli')({
  head: () =>
    pageHead(
      articles['/reference/cli/'].title,
      articles['/reference/cli/'].description,
      '/reference/cli/',
    ),
  component: () => <Article path="/reference/cli/" html={html} />,
});
