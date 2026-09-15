import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/functions';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/functions')({
  head: () =>
    pageHead(
      articles['/zh/learn/functions/'].title,
      articles['/zh/learn/functions/'].description,
      '/zh/learn/functions/',
    ),
  component: () => <Article path="/zh/learn/functions/" html={html} />,
});
