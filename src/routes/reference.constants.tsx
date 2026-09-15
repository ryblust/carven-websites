import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/constants';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/constants')({
  head: () =>
    pageHead(
      articles['/reference/constants/'].title,
      articles['/reference/constants/'].description,
      '/reference/constants/',
    ),
  component: () => <Article path="/reference/constants/" html={html} />,
});
