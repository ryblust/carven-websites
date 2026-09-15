import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/ownership';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/ownership')({
  head: () =>
    pageHead(
      articles['/zh/learn/ownership/'].title,
      articles['/zh/learn/ownership/'].description,
      '/zh/learn/ownership/',
    ),
  component: () => <Article path="/zh/learn/ownership/" html={html} />,
});
