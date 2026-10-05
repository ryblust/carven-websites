import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '../lib/head';
import Playground from '../views/Playground';

export const Route = createFileRoute('/playground')({
  head: () =>
    pageHead(
      'Playground',
      'Check and interpret one Carven file in your browser, inspect AST and tokens, and explore the generated C++.',
      '/playground/',
    ),
  component: () => <Playground locale="en" />,
});
