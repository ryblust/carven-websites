export const designReadingGroups = [
  {
    id: 'language',
    title: { zh: '语言设计', en: 'Language design' },
    readings: [
      {
        path: '/philosophy/',
        topic: { zh: '设计取舍与类型推断', en: 'Design choices and inference' },
      },
      {
        path: '/features/failure-contracts/',
        topic: { zh: '失败与恢复', en: 'Failures and recovery' },
      },
      {
        path: '/features/compile-time/',
        topic: { zh: '编译期执行', en: 'Compile-time execution' },
      },
    ],
  },
  {
    id: 'implementation',
    title: { zh: '编译与运行', en: 'Compilation and execution' },
    readings: [
      {
        path: '/internals/compiler-architecture/',
        topic: { zh: '编译器架构', en: 'Compiler architecture' },
      },
      {
        path: '/internals/runtime-boundary/',
        topic: { zh: '内建能力与运行支持', en: 'Built-ins and runtime support' },
      },
      {
        path: '/features/cpp-generation/',
        topic: { zh: 'C++ 生成与原生集成', en: 'C++ generation and integration' },
      },
    ],
  },
] as const;
