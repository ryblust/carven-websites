import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/features/cpp-generation';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/features/cpp-generation')({
  head: () =>
    pageHead(
      articles['/features/cpp-generation/'].title,
      articles['/features/cpp-generation/'].description,
      '/features/cpp-generation/',
    ),
  component: () => <Article path="/features/cpp-generation/" html={html} />,
});
