import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '../lib/head';
import Playground from '../views/Playground';

export const Route = createFileRoute('/zh/playground')({
  head: () =>
    pageHead(
      'Playground',
      '在浏览器中运行和测试 Carven 项目，编辑输入文件，并通过交互预览调用定价规则。',
      '/zh/playground/',
    ),
  component: () => <Playground locale="zh" />,
});
