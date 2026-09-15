import { createFileRoute } from '@tanstack/react-router';
import HomeEnglish from '../views/HomeEnglish';
import { pageHead } from '../lib/head';
export const Route = createFileRoute('/')({
  head: () =>
    pageHead(
      undefined,
      'Carven is a programming language and compiler targeting C++20. Express ownership, typed failure contracts, and compile-time computation while keeping native C++ integration.',
      '/',
    ),
  component: HomeEnglish,
});
