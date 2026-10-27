import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '../lib/head';
import Playground from '../views/Playground';

export const Route = createFileRoute('/zh/playground')({
  head: () =>
    pageHead(
      'Playground',
      '在浏览器中运行和测试 Carven 项目，实时修改组件与图表，调用定价规则，并编辑输入文件。',
      '/zh/playground/',
    ),
  component: () => <Playground locale="zh" />,
});
