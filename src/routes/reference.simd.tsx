import { createFileRoute } from '@tanstack/react-router';
import Article from '../layouts/Article';
import { articles } from '../generated/manifest';
import html from '../generated/articles/reference/simd';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/reference/simd')({
  head: () =>
    pageHead(
      articles['/reference/simd/'].title,
      articles['/reference/simd/'].description,
      '/reference/simd/',
    ),
  component: () => <Article path="/reference/simd/" html={html} />,
});
