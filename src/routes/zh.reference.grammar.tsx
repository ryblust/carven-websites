import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/grammar';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/grammar')({
  head: () =>
    pageHead(
      articles['/zh/reference/grammar/'].title,
      articles['/zh/reference/grammar/'].description,
      '/zh/reference/grammar/',
    ),
  component: () => <Article path="/zh/reference/grammar/" html={html} />,
});
