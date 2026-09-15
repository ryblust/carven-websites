import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/toolchain';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/toolchain')({
  head: () =>
    pageHead(
      articles['/reference/toolchain/'].title,
      articles['/reference/toolchain/'].description,
      '/reference/toolchain/',
    ),
  component: () => <Article path="/reference/toolchain/" html={html} />,
});
