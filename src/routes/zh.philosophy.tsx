import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/philosophy';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/philosophy')({
  head: () =>
    pageHead(
      articles['/zh/philosophy/'].title,
      articles['/zh/philosophy/'].description,
      '/zh/philosophy/',
    ),
  component: () => <Article path="/zh/philosophy/" html={html} />,
});
