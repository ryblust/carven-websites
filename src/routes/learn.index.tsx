import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/index';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/')({
  head: () => pageHead(articles['/learn/'].title, articles['/learn/'].description, '/learn/'),
  component: () => <Article path="/learn/" html={html} />,
});
