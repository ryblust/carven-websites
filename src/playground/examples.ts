import { homeExamples } from '../content/home-examples.ts';

export const playgroundExamples = [
  {
    id: 'json-config',
    title: { en: 'JSON configuration', zh: '编译期 JSON 配置' },
    description: {
      en: 'Parse a default configuration during compilation, then edit a runtime copy while keeping the original unchanged.',
      zh: '在编译期解析默认配置，运行时修改一份独立副本，原配置保持不变。',
    },
    defaultView: 'output',
    source: homeExamples.configuration,
  },
  {
    id: 'log-analysis',
    title: { en: 'Process log records', zh: '逐条处理日志记录' },
    description: {
      en: 'Read the latency and message from each record. Report a malformed line and continue with the next.',
      zh: '把每行拆成耗时和消息；遇到格式错误时报告该行，继续处理后面的记录。',
    },
    defaultView: 'output',
    source: homeExamples.logAnalysis,
  },
  {
    id: 'async-workflow',
    title: { en: 'Concurrent batches', zh: '并发批次与候选选择' },
    description: {
      en: 'Filter negative records and total two batches concurrently, then select a result that meets the target.',
      zh: '并发筛除两批数据中的负数并计算合计值，再选择达到目标值的结果。',
    },
    defaultView: 'output',
    source: homeExamples.asyncWorkflow,
  },
  {
    id: 'async-scope',
    title: { en: 'Compile-time async', zh: '编译期异步' },
    description: {
      en: 'Run the same async code at compile time and runtime: execute one step, cancel and close the child, then read the updated count.',
      zh: '同一段异步代码在编译期和运行时都先执行一轮工作，再取消、关闭子任务，最后读取计数。',
    },
    defaultView: 'output',
    source: homeExamples.asyncScope,
  },
  {
    id: 'audio-mixer',
    title: { en: 'SIMD audio mixing', zh: 'SIMD 音频混音' },
    description: {
      en: 'Mix eight float samples at a time, count clipped samples, and check the final partial block during compilation.',
      zh: '每次混合八个浮点样本，统计限幅样本数，并在编译时检查最后不足八个样本的尾部。',
    },
    defaultView: 'output',
    source: homeExamples.audioMixer,
  },
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
    title: { en: 'Identifier format', zh: '按固定格式检查编号' },
    description: {
      en: 'Fix the INV-DDDD pattern at compile time, then validate identifiers at runtime.',
      zh: '编译时固定 INV-DDDD 格式，再在运行时检查编号是否符合要求。',
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
      en: 'Merge a JSON configuration with nlohmann/json. Generate C++ here, then run it locally.',
      zh: '用 nlohmann/json 合并 JSON 配置。在这里生成 C++，然后在本地运行。',
    },
    defaultView: 'cpp',
    source: homeExamples.native,
  },
] as const;
