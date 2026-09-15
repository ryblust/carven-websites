import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/features/failure-contracts';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/features/failure-contracts')({
  head: () =>
    pageHead(
      articles['/zh/features/failure-contracts/'].title,
      articles['/zh/features/failure-contracts/'].description,
    ),
  component: () => <Article path="/zh/features/failure-contracts/" html={html} />,
});
