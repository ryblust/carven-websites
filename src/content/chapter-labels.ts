import { articles, type ArticlePath } from '../generated/manifest';
import { localeOf, unlocalizedPath } from '../lib/i18n';

type ChapterPath = Extract<ArticlePath, `/learn/${string}` | `/reference/${string}`>;

// Keep navigation labels brief; article headings retain the full descriptive titles.
const labels = {
  '/learn/': ['第一个程序', 'First program'],
  '/learn/values/': ['命名与更新值', 'Names and values'],
  '/learn/control/': ['分支与循环', 'Branches and loops'],
  '/learn/functions/': ['函数', 'Functions'],
  '/learn/aggregates/': ['结构体、数组与枚举', 'Data structures'],
  '/learn/ownership/': ['读取、修改与转移', 'Read, write, move'],
  '/learn/text/': ['文本与借用', 'Text and borrowing'],
  '/learn/formatting/': ['格式化与打印', 'Format and print'],
  '/learn/modules/': ['模块', 'Modules'],
  '/learn/failures/': ['失败与契约', 'Failure contracts'],
  '/learn/closures/': ['闭包与捕获', 'Closures'],
  '/learn/testing/': ['测试', 'Testing'],
  '/learn/constants/': ['编译期计算', 'Compile-time data'],
  '/learn/interop/': ['C++ 互操作', 'C++ interop'],
  '/learn/pointers/': ['地址与非空检查', 'Native addresses'],
  '/learn/project/': ['实践：库存更新', 'Project: inventory'],
  '/learn/workflow/': ['运行、格式化与排错', 'Tools and workflow'],
  '/reference/': ['语言参考', 'Overview'],
  '/reference/types/': ['类型与转换', 'Types and casts'],
  '/reference/lexical/': ['词法与字面量', 'Syntax and literals'],
  '/reference/grammar/': ['语法与优先级', 'Grammar'],
  '/reference/ownership/': ['访问与所有权', 'Ownership'],
  '/reference/control/': ['控制流与模式', 'Control flow'],
  '/reference/functions/': ['函数与调用', 'Functions'],
  '/reference/aggregates/': ['复合类型', 'Aggregate types'],
  '/reference/closures/': ['闭包与可调用视图', 'Closures and views'],
  '/reference/failures/': ['失败契约', 'Failure contracts'],
  '/reference/constants/': ['常量与编译期计算', 'Constants'],
  '/reference/text/': ['字符与文本', 'Characters and text'],
  '/reference/formatting/': ['插值与格式化', 'Text formatting'],
  '/reference/slices/': ['切片与静态存储', 'Slices'],
  '/reference/pointers/': ['指针与外部地址', 'Pointers'],
  '/reference/modules/': ['模块与可见性', 'Modules'],
  '/reference/interop/': ['C++ 互操作', 'C++ interop'],
  '/reference/entry-testing/': ['入口与测试', 'Entry and testing'],
  '/reference/cli/': ['编译器命令', 'Compiler commands'],
  '/reference/toolchain/': ['构建与原生集成', 'Build integration'],
  '/reference/diagnostics/': ['诊断代码', 'Diagnostics'],
  '/reference/utf/': ['UTF 标准库', 'UTF library'],
  '/reference/simd/': ['SIMD 向量与掩码', 'SIMD vectors and masks'],
} satisfies Record<ChapterPath, readonly [string, string]>;

export function chapterLabel(path: ArticlePath): string {
  const key = unlocalizedPath(path);
  return key in labels
    ? labels[key as ChapterPath][localeOf(path) === 'zh' ? 0 : 1]
    : articles[path].title;
}
