import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/use-cases';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/use-cases')({
  head: () =>
    pageHead(
      articles['/zh/use-cases/'].title,
      articles['/zh/use-cases/'].description,
      '/zh/use-cases/',
    ),
  component: () => <Article path="/zh/use-cases/" html={html} />,
});
