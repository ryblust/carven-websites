import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '../lib/head';
import Playground from '../views/Playground';

export const Route = createFileRoute('/zh/playground')({
  head: () =>
    pageHead(
      'Playground',
      '在浏览器中检查和解释执行一个 Carven 文件，查看 AST、Tokens 和生成的 C++。',
      '/zh/playground/',
    ),
  component: () => <Playground locale="zh" />,
});
