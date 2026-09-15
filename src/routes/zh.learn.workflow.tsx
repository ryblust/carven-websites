import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/workflow';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/workflow')({
  head: () =>
    pageHead(
      articles['/zh/learn/workflow/'].title,
      articles['/zh/learn/workflow/'].description,
      '/zh/learn/workflow/',
    ),
  component: () => <Article path="/zh/learn/workflow/" html={html} />,
});
