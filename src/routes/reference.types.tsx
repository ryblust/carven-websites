import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/types';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/types')({
  head: () =>
    pageHead(
      articles['/reference/types/'].title,
      articles['/reference/types/'].description,
      '/reference/types/',
    ),
  component: () => <Article path="/reference/types/" html={html} />,
});
