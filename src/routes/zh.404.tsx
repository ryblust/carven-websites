import { createFileRoute } from '@tanstack/react-router';
import Page from '../views/NotFound';
import { pageHead } from '../lib/head';

export const Route = createFileRoute('/zh/404')({
  head: () => pageHead('找不到这个页面', '这条路径还没有内容。回到 Carven 首页或开始学习语言。'),
  component: Page,
});
