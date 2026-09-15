import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/features/failure-contracts';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/features/failure-contracts')({
  head: () =>
    pageHead(
      articles['/features/failure-contracts/'].title,
      articles['/features/failure-contracts/'].description,
      '/features/failure-contracts/',
    ),
  component: () => <Article path="/features/failure-contracts/" html={html} />,
});
