export const designReadingGroups = [
  {
    id: 'start',
    title: { zh: '整体架构', en: 'Architecture' },
    readings: [
      {
        path: '/internals/compiler-architecture/',
        topic: { zh: '编译器架构', en: 'Compiler architecture' },
      },
    ],
  },
  {
    id: 'implementation',
    title: { zh: '走进原生实现', en: 'Native implementation' },
    readings: [
      {
        path: '/internals/runtime-boundary/',
        topic: { zh: 'Runtime · Crafts · C++', en: 'Runtime · Crafts · C++' },
      },
      {
        path: '/features/cpp-generation/',
        topic: { zh: 'C++ 生成', en: 'C++ generation' },
      },
    ],
  },
  {
    id: 'principles',
    title: { zh: '理解语言的选择', en: 'Language design choices' },
    readings: [
      { path: '/philosophy/', topic: { zh: '设计哲学', en: 'Philosophy' } },
      {
        path: '/internals/syntax-and-inference/',
        topic: { zh: '语法与推断', en: 'Syntax & inference' },
      },
      {
        path: '/features/failure-contracts/',
        topic: { zh: '失败契约', en: 'Failure contracts' },
      },
      {
        path: '/features/compile-time/',
        topic: { zh: '编译期计算', en: 'Compile-time' },
      },
    ],
  },
] as const;
