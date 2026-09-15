import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/philosophy';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/philosophy')({
  head: () =>
    pageHead(articles['/philosophy/'].title, articles['/philosophy/'].description, '/philosophy/'),
  component: () => <Article path="/philosophy/" html={html} />,
});
