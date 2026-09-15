import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/project';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/project')({
  head: () =>
    pageHead(
      articles['/learn/project/'].title,
      articles['/learn/project/'].description,
      '/learn/project/',
    ),
  component: () => <Article path="/learn/project/" html={html} />,
});
