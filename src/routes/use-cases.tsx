import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/use-cases';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/use-cases')({
  head: () =>
    pageHead(articles['/use-cases/'].title, articles['/use-cases/'].description, '/use-cases/'),
  component: () => <Article path="/use-cases/" html={html} />,
});
