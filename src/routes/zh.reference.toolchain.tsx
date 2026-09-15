import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/toolchain';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/toolchain')({
  head: () =>
    pageHead(
      articles['/zh/reference/toolchain/'].title,
      articles['/zh/reference/toolchain/'].description,
    ),
  component: () => <Article path="/zh/reference/toolchain/" html={html} />,
});
