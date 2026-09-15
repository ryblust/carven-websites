import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/grammar';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/grammar')({
  head: () =>
    pageHead(
      articles['/reference/grammar/'].title,
      articles['/reference/grammar/'].description,
      '/reference/grammar/',
    ),
  component: () => <Article path="/reference/grammar/" html={html} />,
});
