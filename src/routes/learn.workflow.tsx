import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/workflow';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/workflow')({
  head: () =>
    pageHead(
      articles['/learn/workflow/'].title,
      articles['/learn/workflow/'].description,
      '/learn/workflow/',
    ),
  component: () => <Article path="/learn/workflow/" html={html} />,
});
