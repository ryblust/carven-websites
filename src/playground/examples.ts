import { languageExamples } from './language-examples.ts';
import { extraExamples } from './extra-examples.ts';
import { workspaceExamples } from './workspace-examples.ts';

export const playgroundExamples = [
  ...workspaceExamples,
  {
    id: 'toml-summary',
    title: { en: 'Count slow requests by service', zh: '按服务统计慢请求' },
    description: {
      en: 'Edit a TOML policy and a request log. Exclude ignored services with HashSet, count slow requests with HashMap, and test the policy independently.',
      zh: '修改 TOML 策略和请求日志，用 HashSet 排除忽略的服务，再用 HashMap 统计慢请求。策略也有独立的内联测试。',
    },
    defaultView: 'output',
    source: `import std::fs using read_text;
import std::toml using TOMLValue;
import .summary using summarize;

let settings = read_text("settings.toml")?;
let config = TOMLValue::parse(settings.as_str())?;
let requests = read_text("requests.log")?;
let report = summarize(config, requests.as_str())?;

for entry in report.counts.entries() {
    println(f"{entry.key}: {entry.value}");
}

println(f"accepted: {report.accepted}");
`,
    files: {
      'summary.cv': extraExamples.requestSummary,
      'settings.toml': 'minimum_ms = 20\nignored = ["health"]\n',
      'requests.log': 'api 25\nhealth 100\napi 35\nweb 18\nweb 40\n',
    },
    selectedFile: 'summary.cv',
  },
  {
    id: 'async-pipeline',
    title: { en: 'Process orders through a bounded queue', zh: '通过有界队列处理订单' },
    description: {
      en: 'Read order amounts from a file, transfer owned messages through a bounded channel, and wait for every accepted order. Run the adjacent async tests to check totals and completion.',
      zh: '从文件读取订单金额，通过有界通道传递有所有权的消息，并等待已接收订单全部处理完毕。旁边的异步测试会检查合计和完成行为。',
    },
    defaultView: 'output',
    source: `import std::fs using { read_text, FileError }
import std::utf using { lines, UTF8Error }
import std::core using NumberParseError;
import .pipeline using process;

async fn main() throw FileError + UTF8Error + NumberParseError {
    let text = read_text("orders.txt")?;
    let result = await process(&&lines(text.as_str()))?;
    println("Orders:", result.orders);
    println("Total (cents):", result.total);
}
`,
    files: {
      'pipeline.cv': extraExamples.orderPipeline,
      'orders.txt': '1200\n1800\n2400\n',
    },
    selectedFile: 'pipeline.cv',
  },
  {
    id: 'closure-policy',
    title: { en: 'Capture a pricing policy', zh: '捕获报价策略' },
    description: {
      en: 'Check a captured fee during compilation, copy the policy, and reuse a generic callback to compare original and updated quotes.',
      zh: '编译期检查捕获的费用，复制报价策略，再通过泛型回调比较原设置与新设置的报价。',
    },
    defaultView: 'output',
    source: languageExamples.closurePolicy,
  },
  {
    id: 'channel-pipeline',
    title: { en: 'Bound a producer-consumer queue', zh: '有界生产与消费' },
    description: {
      en: 'A one-message ByteChannel suspends sends when full. After the producer closes it, the consumer drains queued batches before reaching the end.',
      zh: '容量为一条消息的 ByteChannel 满载后暂停发送；生产者关闭通道后，消费者先排空已入队批次，再读到结束。',
    },
    defaultView: 'output',
    source: extraExamples.channelPipeline,
  },
  {
    id: 'file-report',
    producesFiles: true,
    title: { en: 'Build a release report from files', zh: '从文件生成发布报告' },
    description: {
      en: 'Write a sample TOML manifest, read and total its artifacts, then save a report. Files are isolated to this invocation.',
      zh: '写入示例 TOML 清单，读取并汇总产物，再保存报告。文件仅存在于本次调用的隔离环境。',
    },
    defaultView: 'output',
    source: extraExamples.fileReport,
  },
  {
    id: 'async-tests',
    title: { en: 'Test async work and cleanup', zh: '测试异步工作与清理' },
    description: {
      en: 'Use async tests to check independent batch results and child-task cleanup. Check the same subtotal calculation at compile time.',
      zh: '用异步测试检查独立批次的结果和子任务清理，并在编译期验证相同的合计算法。',
    },
    defaultView: 'tests',
    source: extraExamples.asyncTests,
  },
  {
    id: 'json-config',
    title: { en: 'JSON configuration', zh: '编译期 JSON 配置' },
    description: {
      en: 'Parse a default configuration during compilation, then edit a runtime copy while keeping the original unchanged.',
      zh: '在编译期解析默认配置，运行时修改一份独立副本，原配置保持不变。',
    },
    defaultView: 'output',
    source: languageExamples.configuration,
  },
  {
    id: 'log-analysis',
    title: { en: 'Process log records', zh: '逐条处理日志记录' },
    description: {
      en: 'Read the latency and message from each record. Report a malformed line and continue with the next.',
      zh: '把每行拆成耗时和消息；遇到格式错误时报告该行，继续处理后面的记录。',
    },
    defaultView: 'output',
    source: languageExamples.logAnalysis,
  },
  {
    id: 'async-workflow',
    title: { en: 'Concurrent batches', zh: '并发批次与候选选择' },
    description: {
      en: 'Filter negative records and total two batches concurrently, then select a result that meets the target.',
      zh: '并发筛除两批数据中的负数并计算合计值，再选择达到目标值的结果。',
    },
    defaultView: 'output',
    source: languageExamples.asyncWorkflow,
  },
  {
    id: 'async-scope',
    title: { en: 'Compile-time async', zh: '编译期异步' },
    description: {
      en: 'Run the same async code at compile time and runtime: execute one step, cancel and close the child, then read the updated count.',
      zh: '同一段异步代码在编译期和运行时都先执行一轮工作，再取消、关闭子任务，最后读取计数。',
    },
    defaultView: 'output',
    source: languageExamples.asyncScope,
  },
  {
    id: 'audio-mixer',
    title: { en: 'SIMD audio mixing', zh: 'SIMD 音频混音' },
    description: {
      en: 'Mix eight float samples at a time, count clipped samples, and check the final partial block during compilation.',
      zh: '每次混合八个浮点样本，统计限幅样本数，并在编译时检查最后不足八个样本的尾部。',
    },
    defaultView: 'output',
    source: languageExamples.audioMixer,
  },
  {
    id: 'hello',
    title: { en: 'Hello, Carven', zh: '你好，Carven' },
    description: {
      en: 'Compute a value and print it.',
      zh: '计算一个值并输出。',
    },
    defaultView: 'output',
    source: languageExamples.quickstart,
  },
  {
    id: 'structured-output',
    title: { en: 'Structured output', zh: '结构化输出' },
    description: {
      en: 'Print a structure containing an enum and an array.',
      zh: '输出包含枚举和数组的结构体。',
    },
    defaultView: 'output',
    source: languageExamples.display,
  },
  {
    id: 'typed-failures',
    title: { en: 'Typed failures', zh: '类型化失败' },
    description: {
      en: 'Propagate typed failures and handle each case explicitly.',
      zh: '传播类型化失败，并显式处理每种情况。',
    },
    defaultView: 'output',
    source: languageExamples.failures,
  },
  {
    id: 'static-text',
    title: { en: 'Compile-time text', zh: '编译期文本' },
    description: {
      en: 'Build a help message during compilation and verify it with a static test.',
      zh: '在编译期生成帮助文本，并用静态测试验证。',
    },
    defaultView: 'output',
    source: languageExamples.constants,
  },
  {
    id: 'specialization',
    title: { en: 'Identifier format', zh: '按固定格式检查编号' },
    description: {
      en: 'Fix the INV-DDDD pattern at compile time, then validate identifiers at runtime.',
      zh: '编译时固定 INV-DDDD 格式，再在运行时检查编号是否符合要求。',
    },
    defaultView: 'output',
    source: languageExamples.specialization,
  },
  {
    id: 'simd-bytes',
    title: { en: 'SIMD byte scanning', zh: 'SIMD 字节扫描' },
    description: {
      en: 'Count delimiters in 32-byte blocks, masking out padding in the final block.',
      zh: '按 32 字节块统计分隔符，用掩码排除最后一块的补零位置。',
    },
    defaultView: 'output',
    source: languageExamples.simd,
  },
  {
    id: 'native-json',
    title: { en: 'Call a C++ library', zh: '调用 C++ 库' },
    description: {
      en: 'Merge a JSON configuration with nlohmann/json. Generate C++ here, then run it locally.',
      zh: '用 nlohmann/json 合并 JSON 配置。在这里生成 C++，然后在本地运行。',
    },
    defaultView: 'cpp',
    source: languageExamples.native,
  },
] as const;

const projectIds = [
  'component-studio',
  'workspace-report',
  'toml-summary',
  'async-pipeline',
  'audio-mixer',
  'native-json',
] as const;

export const playgroundProjects = projectIds.map((id) =>
  playgroundExamples.find((example) => example.id === id)!,
);
