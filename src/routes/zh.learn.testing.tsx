import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/testing';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/testing')({
  head: () =>
    pageHead(
      articles['/zh/learn/testing/'].title,
      articles['/zh/learn/testing/'].description,
      '/zh/learn/testing/',
    ),
  component: () => <Article path="/zh/learn/testing/" html={html} />,
});
