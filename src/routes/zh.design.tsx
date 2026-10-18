import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '../lib/head';
import Design from '../views/Design';

export const Route = createFileRoute('/zh/design')({
  head: () =>
    pageHead(
      '设计与原理',
      '了解 Carven 的设计取舍、类型推断、失败处理与编译期执行，再沿编译流程理解运行支持和 C++ 集成。',
      '/zh/design/',
    ),
  component: () => <Design locale="zh" />,
});
