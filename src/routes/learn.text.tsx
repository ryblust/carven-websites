import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/learn/text';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/learn/text')({
  head: () =>
    pageHead(articles['/learn/text/'].title, articles['/learn/text/'].description, '/learn/text/'),
  component: () => <Article path="/learn/text/" html={html} />,
});
