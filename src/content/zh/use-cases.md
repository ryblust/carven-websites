---
title: "应用示例"
description: "尝试三个完整应用，阅读对应源码和测试，理解它们如何实现。"
section: use-cases
source: examples/README.md
---

先从可以运行的任务开始：把日志变成报告、混合样本数据，或者从 C++ 调用 Carven 模块。这些应用展示所有权、类型化失败、编译期工作和异步如何组合。

先确保终端可以调用 `carven` 和支持 C++20 的工具链。新建一个工作目录，把链接中的 `log_analyzer` 与 `audio_mixer` 源码目录复制到其中。以下命令均在该目录执行，只需指定入口文件，所需应用模块由导入加载。

## 分析日志流

[日志分析器](https://github.com/ryblust/carven/tree/v0.1.0/examples/log_analyzer) 解析级别、数字延迟和 Unicode 消息；逐条拒绝坏记录，在保留消息前脱敏凭据，把慢事件放入 `Vector<String>`，最终输出 JSON 报告。

`analysis.cv` 负责解析与报告，`main.cv` 负责命令行参数和异步标准输入。JSON 报告模板在编译期解析，并保留其完整数据。对应测试验证解析、脱敏与报告。

```sh
carven run log_analyzer/main.cv
```

在浏览器中运行[记录解析](/zh/playground/#example=log-analysis)和[JSON 模板修改](/zh/playground/#example=json-config)，了解解析和修改规则。完整程序也能通过 `--stdin` 在显式输入上限内读取数据。

## 用浮点 SIMD 混音

[音频混音器](https://github.com/ryblust/carven/tree/v0.1.0/examples/audio_mixer) 根据可配置增益混合两条内嵌轨道。它的 `const fn` 每块处理八个浮点样本，拒绝非有限结果，并将混合信号限制在 −1 到 1。报告给出限幅样本数量、峰值和均方根（RMS）电平。有效通道掩码标记最后一块中哪些位置来自输入，避免补零影响结果。

```sh
carven run audio_mixer/main.cv -- --voice=1.0 --music=0.5
carven run audio_mixer/main.cv -- --logs > mixer.log
carven run log_analyzer/main.cv -- --stdin < mixer.log
```

后两条命令通过共享的日志格式连接混音器与分析器。样本直接写在源码中，运行应用会打印计算结果，不播放音频。[运行核心混音算法](/zh/playground/#example=audio-mixer)，其中静态测试验证最后一个样本。

## 让 C++ 托管 Carven 模块

[流收集器](https://github.com/ryblust/carven/tree/v0.1.0/examples/stream_collector) 把程序入口和流提供方保留在 C++ 中。C++ 调用 `export(cpp)` Carven 函数，读取两条宿主拥有的内存流，用 `HashSet<String>` 去重，并返回包含计数和独立记录数据的报告。

该示例包含 C++ 入口与提供方。按项目的[原生构建说明](https://github.com/ryblust/carven/tree/v0.1.0/examples/stream_collector)构建并运行宿主应用。

C++ 包含生成的 API 头文件，通过 Xmake 规则链接生成实现。[C++ 生成](/zh/features/cpp-generation/)沿着这个应用说明接口、存储和清理。

## 组合异步应用工作

[运行批次工作流](/zh/playground/#example=async-workflow)，尝试同时处理独立记录，并从候选结果中选择一个。[作用域示例](/zh/playground/#example=async-scope)展示取消与清理，还包含同一流程的静态测试。继续学习如何构造这些流程，见[异步教程](/zh/learn/async/)；查找输入、时间和网络 API，使用[标准 API 索引](/zh/reference/library/)。
