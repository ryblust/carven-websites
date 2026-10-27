import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '../lib/head';
import Playground from '../views/Playground';

export const Route = createFileRoute('/playground')({
  head: () =>
    pageHead(
      'Playground',
      'Run and test Carven projects in your browser, edit input files, and call a pricing rule in an interactive preview.',
      '/playground/',
    ),
  component: () => <Playground locale="en" />,
});
