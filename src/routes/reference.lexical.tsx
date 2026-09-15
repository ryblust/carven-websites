import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/lexical';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/lexical')({
  head: () =>
    pageHead(
      articles['/reference/lexical/'].title,
      articles['/reference/lexical/'].description,
      '/reference/lexical/',
    ),
  component: () => <Article path="/reference/lexical/" html={html} />,
});
