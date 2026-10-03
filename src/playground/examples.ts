import { homeExamples } from '../content/home-examples';

export const playgroundExamples = [
  {
    id: 'hello',
    title: { en: 'Hello, Carven', zh: '你好，Carven' },
    description: {
      en: 'Compute a value and print it.',
      zh: '计算一个值并输出。',
    },
    source: homeExamples.quickstart,
  },
  {
    id: 'structured-output',
    title: { en: 'Structured output', zh: '结构化输出' },
    description: {
      en: 'Print a structure containing an enum and an array.',
      zh: '输出包含枚举和数组的结构体。',
    },
    source: homeExamples.display,
  },
  {
    id: 'typed-failures',
    title: { en: 'Typed failures', zh: '类型化失败' },
    description: {
      en: 'Propagate typed failures and handle each case explicitly.',
      zh: '传播类型化失败，并显式处理每种情况。',
    },
    source: homeExamples.failures,
  },
  {
    id: 'static-text',
    title: { en: 'Compile-time text', zh: '编译期文本' },
    description: {
      en: 'Build a help message during compilation and verify it with a static test.',
      zh: '在编译期生成帮助文本，并用静态测试验证。',
    },
    source: homeExamples.constants,
  },
  {
    id: 'specialization',
    title: { en: 'Static specialization', zh: '静态特化' },
    description: {
      en: 'Specialize an identifier check for a constant pattern.',
      zh: '为固定模式特化一个编号检查函数。',
    },
    source: homeExamples.specialization,
  },
] as const;
