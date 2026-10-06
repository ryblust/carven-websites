import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '../lib/head';
import Design from '../views/Design';

export const Route = createFileRoute('/zh/design')({
  head: () =>
    pageHead(
      '设计与原理',
      '从整体编译器架构，到语义分析、C++ 生成、运行库与语言设计，读懂 Carven。',
      '/zh/design/',
    ),
  component: () => <Design locale="zh" />,
});
