import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/constants';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/constants')({
  head: () =>
    pageHead(
      articles['/zh/reference/constants/'].title,
      articles['/zh/reference/constants/'].description,
    ),
  component: () => <Article path="/zh/reference/constants/" html={html} />,
});
