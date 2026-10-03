import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/zh/reference/simd';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/reference/simd')({
  head: () =>
    pageHead(
      articles['/zh/reference/simd/'].title,
      articles['/zh/reference/simd/'].description,
      '/zh/reference/simd/',
    ),
  component: () => <Article path="/zh/reference/simd/" html={html} />,
});
