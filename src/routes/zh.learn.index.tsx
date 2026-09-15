import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/learn/index';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/learn/')({
  head: () =>
    pageHead(articles['/zh/learn/'].title, articles['/zh/learn/'].description, '/zh/learn/'),
  component: () => <Article path="/zh/learn/" html={html} />,
});
