import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/ownership';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/ownership')({
  head: () =>
    pageHead(
      articles['/zh/reference/ownership/'].title,
      articles['/zh/reference/ownership/'].description,
    ),
  component: () => <Article path="/zh/reference/ownership/" html={html} />,
});
