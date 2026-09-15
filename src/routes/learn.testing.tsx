import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/testing';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/testing')({
  head: () =>
    pageHead(
      articles['/learn/testing/'].title,
      articles['/learn/testing/'].description,
      '/learn/testing/',
    ),
  component: () => <Article path="/learn/testing/" html={html} />,
});
