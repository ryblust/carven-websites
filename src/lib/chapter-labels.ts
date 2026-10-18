import { articles, type ArticlePath } from '../generated/manifest';
import { localeOf, unlocalizedPath } from './i18n';

type ChapterPath = Extract<ArticlePath, `/learn/${string}`>;

// Tutorials use short lesson labels; reference pages use their published titles.
const labels = {
  '/learn/': ['总览', 'Overview'],
  '/learn/first-program/': ['第一个程序', 'First program'],
  '/learn/values/': ['变量与类型', 'Variables and types'],
  '/learn/control/': ['分支与循环', 'Branches and loops'],
  '/learn/functions/': ['函数', 'Functions'],
  '/learn/aggregates/': ['结构体、数组与枚举', 'Data structures'],
  '/learn/ownership/': ['读取、修改与转移', 'Read, Write, Take'],
  '/learn/text/': ['文本与借用', 'Text and borrowing'],
  '/learn/formatting/': ['格式化与打印', 'Format and print'],
  '/learn/modules/': ['模块与导入', 'Modules and imports'],
  '/learn/failures/': ['失败与恢复', 'Failures and recovery'],
  '/learn/closures/': ['闭包与捕获', 'Closures and captures'],
  '/learn/testing/': ['测试', 'Testing'],
  '/learn/constants/': ['编译期计算', 'Compile-time computation'],
  '/learn/async/': ['异步工作流', 'Async workflows'],
  '/learn/data-pipeline/': ['项目：JSON 输入', 'Project: JSON input'],
  '/learn/interop/': ['C++ 互操作', 'C++ interop'],
  '/learn/pointers/': ['地址与非空检查', 'Native addresses'],
  '/learn/project/': ['练习：库存批处理', 'Exercise: inventory'],
  '/learn/lsp/': ['项目：语言服务器', 'Project: language server'],
  '/learn/workflow/': ['运行、格式化与排错', 'Tools and workflow'],
} satisfies Record<ChapterPath, readonly [string, string]>;

export function chapterLabel(path: ArticlePath): string {
  const key = unlocalizedPath(path);
  return key in labels
    ? labels[key as ChapterPath][localeOf(path) === 'zh' ? 0 : 1]
    : articles[path].title;
}
