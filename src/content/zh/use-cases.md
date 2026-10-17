---
title: "运行日志分析器、混音器和 C++ 收集器"
description: "尝试三个完整应用，阅读对应源码和测试，理解它们如何实现。"
section: use-cases
source: examples/README.md
---

先从可以运行的任务开始：把日志变成报告、混合样本数据，或者从 C++ 调用 Carven 模块。这些应用展示所有权、类型化失败、编译期工作和异步如何组合。

以下命令均在 Carven 编译器仓库根目录执行。第一组命令构建编译器和三个应用。每个应用目录都包含示例输入、源码和测试。

## 分析日志流

[日志分析器](https://github.com/ryblust/carven/tree/main/examples/log_analyzer) 解析级别、数字延迟和 Unicode 消息；逐条拒绝坏记录，在保留消息前脱敏凭据，把慢事件放入 `Vector<String>`，最终输出 JSON 报告。

`analysis.cv` 负责解析与报告，`main.cv` 负责命令行参数和异步标准输入。拥有所有权的 JSON 报告模板在编译期解析。静态测试验证脱敏和配置；运行时测试覆盖非法字段、无效 UTF-8、CRLF、没有末尾分隔符的行及记录顺序。

```sh
./xmakew build
./xmakew build examples
./xmakew run carven-example-log-analyzer
```

在浏览器中运行[记录解析](/zh/playground/#example=log-analysis)和[JSON 模板修改](/zh/playground/#example=json-config)，探索其中的契约。完整程序也能通过 `--stdin` 在显式输入上限内读取数据。

## 用浮点 SIMD 混音

[音频混音器](https://github.com/ryblust/carven/tree/main/examples/audio_mixer) 根据可配置增益混合两条内嵌轨道。它的 `const fn` 每块处理八个浮点样本，拒绝非有限结果，并将混合信号限制在 −1 到 1。报告给出限幅样本数量、峰值和均方根（RMS）电平。有效通道掩码标记最后一块中哪些位置来自输入，避免补零影响结果。

```sh
./xmakew run carven-example-audio-mixer --voice=1.0 --music=0.5
./xmakew run -q carven-example-audio-mixer --logs > mixer.log
./xmakew run -q carven-example-log-analyzer --stdin < mixer.log
```

后两条命令通过共享的日志格式连接混音器与分析器。样本直接写在源码中，运行应用会打印计算结果，不播放音频。[运行核心混音算法](/zh/playground/#example=audio-mixer)，其中静态测试验证最后一个样本。

原生编译时选择 NEON、显式启用的 AVX2 或可移植实现，没有运行时分派。各翻译单元保持一致的后端选项，并测量实际负载。

## 让 C++ 托管 Carven 模块

[流收集器](https://github.com/ryblust/carven/tree/main/examples/stream_collector) 把程序入口和流提供方保留在 C++ 中。C++ 调用 `export(cpp)` Carven 函数，读取两条宿主拥有的内存流、去重记录，并返回含计数的拥有报告。

```sh
./xmakew run carven-example-stream-collector
```

这个程序展示两个方向的边界：`import(cpp)` 连接提供方，`export(cpp)` 暴露受检查的工作流。C++ 包含生成的 API 头文件，通过 Xmake 规则链接生成实现。提供方在下一次读取时复用行缓冲区，因此收集器将需要保留的记录复制成 String。宿主在调用期间保留流资源，返回报告则拥有自己的记录。见 [C++ 生成](/zh/features/cpp-generation/)。

## 组合异步应用工作

多项任务可以独立推进时，`when_all` 一起启动它们，按输入顺序将结果放入元组。每个结果都可以拥有字符串和向量。`first_successful` 接受备选操作，跳过失败候选，选择成功结果。

`async let` 启动的子任务属于外围作用域。取消和关闭让作用域停止工作并等待清理，再释放子任务借用的数据。[作用域示例](/zh/playground/#example=async-scope) 还会在编译期检查这个流程。

[运行内存批次工作流](/zh/playground/#example=async-workflow)。原生 I/O 可组合有界 `stdin` 读取、行分帧、受检查的时间间隔及超时。`std::net` 为 C++ 宿主接管的连接提供读写；它不建立连接、不监听、不解析域名，也不提供 TLS。

## 根据实际边界验证

使用同一版本的编译器、Crafts、示例和文档。先用 `./xmakew build` 构建编译器，通过 `carven check` 检查语义并运行静态测试，再运行和测试完整原生应用。C++ 名称、重载、模板及提供方实现仍需要原生编译。

Playground 通过解释器运行这些受支持的源操作，外部 C++ 调用和 TCP 操作需要原生宿主。源任务在一个线程上执行；C++ 宿主如果跨线程共享数据，仍须负责同步及外部资源的生命周期。
