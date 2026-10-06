import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '../lib/head';
import Design from '../views/Design';

export const Route = createFileRoute('/design')({
  head: () =>
    pageHead(
      'Design & principles',
      'Explore Carven’s compiler architecture, semantic analysis, C++ generation, runtime support, and language design.',
      '/design/',
    ),
  component: () => <Design locale="en" />,
});
