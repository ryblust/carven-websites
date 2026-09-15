import { createFileRoute } from '@tanstack/react-router';
import Page from '../views/NotFound';
import { pageHead } from '../lib/head';
export const Route = createFileRoute('/404')({
  head: () =>
    pageHead(
      'Page not found',
      'Return to the Carven home page or start learning the language.',
      '/404/',
    ),
  component: Page,
});
