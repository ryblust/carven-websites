import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/ownership';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/ownership')({
  head: () =>
    pageHead(
      articles['/reference/ownership/'].title,
      articles['/reference/ownership/'].description,
      '/reference/ownership/',
    ),
  component: () => <Article path="/reference/ownership/" html={html} />,
});
