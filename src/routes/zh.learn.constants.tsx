import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/constants';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/constants')({
  head: () =>
    pageHead(
      articles['/zh/learn/constants/'].title,
      articles['/zh/learn/constants/'].description,
      '/zh/learn/constants/',
    ),
  component: () => <Article path="/zh/learn/constants/" html={html} />,
});
