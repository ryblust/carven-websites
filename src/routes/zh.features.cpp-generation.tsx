import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/features/cpp-generation';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/features/cpp-generation')({
  head: () =>
    pageHead(
      articles['/zh/features/cpp-generation/'].title,
      articles['/zh/features/cpp-generation/'].description,
    ),
  component: () => <Article path="/zh/features/cpp-generation/" html={html} />,
});
