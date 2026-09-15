import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/project';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/project')({
  head: () =>
    pageHead(
      articles['/zh/learn/project/'].title,
      articles['/zh/learn/project/'].description,
      '/zh/learn/project/',
    ),
  component: () => <Article path="/zh/learn/project/" html={html} />,
});
