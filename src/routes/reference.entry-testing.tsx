import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/entry-testing';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/entry-testing')({
  head: () =>
    pageHead(
      articles['/reference/entry-testing/'].title,
      articles['/reference/entry-testing/'].description,
      '/reference/entry-testing/',
    ),
  component: () => <Article path="/reference/entry-testing/" html={html} />,
});
