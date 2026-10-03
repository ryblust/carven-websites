import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '../lib/head';
import Home from '../views/Home';

export const Route = createFileRoute('/zh/')({
  head: () => pageHead(undefined, '一门编译为 C++ 的语言，沿用你的原生库与工具链。', '/zh/'),
  component: () => <Home locale="zh" />,
});
