import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/index';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/')({
  head: () =>
    pageHead(articles['/reference/'].title, articles['/reference/'].description, '/reference/'),
  component: () => <Article path="/reference/" html={html} />,
});
