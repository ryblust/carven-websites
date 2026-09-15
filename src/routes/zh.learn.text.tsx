import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/text';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/text')({
  head: () =>
    pageHead(
      articles['/zh/learn/text/'].title,
      articles['/zh/learn/text/'].description,
      '/zh/learn/text/',
    ),
  component: () => <Article path="/zh/learn/text/" html={html} />,
});
