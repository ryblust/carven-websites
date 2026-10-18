import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '../lib/head';
import Design from '../views/Design';

export const Route = createFileRoute('/design')({
  head: () =>
    pageHead(
      'Design & principles',
      'Understand Carven’s design choices, type inference, failures, and compile-time execution, then explore compilation, runtime support, and C++ integration.',
      '/design/',
    ),
  component: () => <Design locale="en" />,
});
