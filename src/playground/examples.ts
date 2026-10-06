import { homeExamples } from '../content/home-examples.ts';

export const playgroundExamples = [
  {
    id: 'hello',
    title: { en: 'Hello, Carven', zh: '你好，Carven' },
    description: {
      en: 'Compute a value and print it.',
      zh: '计算一个值并输出。',
    },
    defaultView: 'output',
    source: homeExamples.quickstart,
  },
  {
    id: 'structured-output',
    title: { en: 'Structured output', zh: '结构化输出' },
    description: {
      en: 'Print a structure containing an enum and an array.',
      zh: '输出包含枚举和数组的结构体。',
    },
    defaultView: 'output',
    source: homeExamples.display,
  },
  {
    id: 'typed-failures',
    title: { en: 'Typed failures', zh: '类型化失败' },
    description: {
      en: 'Propagate typed failures and handle each case explicitly.',
      zh: '传播类型化失败，并显式处理每种情况。',
    },
    defaultView: 'output',
    source: homeExamples.failures,
  },
  {
    id: 'static-text',
    title: { en: 'Compile-time text', zh: '编译期文本' },
    description: {
      en: 'Build a help message during compilation and verify it with a static test.',
      zh: '在编译期生成帮助文本，并用静态测试验证。',
    },
    defaultView: 'output',
    source: homeExamples.constants,
  },
  {
    id: 'specialization',
    title: { en: 'Static specialization', zh: '静态特化' },
    description: {
      en: 'Specialize an identifier check for a constant pattern.',
      zh: '为固定模式特化一个编号检查函数。',
    },
    defaultView: 'output',
    source: homeExamples.specialization,
  },
  {
    id: 'simd-bytes',
    title: { en: 'SIMD byte scanning', zh: 'SIMD 字节扫描' },
    description: {
      en: 'Count delimiters in 32-byte blocks, masking out padding in the final block.',
      zh: '按 32 字节块统计分隔符，用掩码排除最后一块的补零位置。',
    },
    defaultView: 'output',
    source: homeExamples.simd,
  },
  {
    id: 'native-json',
    title: { en: 'Call a C++ library', zh: '调用 C++ 库' },
    description: {
      en: 'Merge a JSON configuration with nlohmann/json. Generate C++ here; run it locally with the Carven runtime and nlohmann/json 3.12.0. The browser interpreter cannot execute external C++ calls.',
      zh: '用 nlohmann/json 合并 JSON 配置。这里可以生成 C++；本地运行需要 Carven runtime 和 nlohmann/json 3.12.0。浏览器解释器无法执行外部 C++ 调用。',
    },
    defaultView: 'cpp',
    source: homeExamples.native,
  },
] as const;
