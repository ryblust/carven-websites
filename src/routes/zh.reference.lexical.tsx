import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/lexical';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/lexical')({
  head: () =>
    pageHead(
      articles['/zh/reference/lexical/'].title,
      articles['/zh/reference/lexical/'].description,
      '/zh/reference/lexical/',
    ),
  component: () => <Article path="/zh/reference/lexical/" html={html} />,
});
