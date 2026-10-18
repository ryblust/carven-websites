---
title: "从源码到原生程序"
description: "从解析和检查，到执行与 C++ 生成，理解各阶段如何配合。"
section: internals
source: docs/compiler/README.md
---

## 从源码到原生程序

生成一次调用前，编译器需要知道实参类型、可能的失败，以及哪些存储必须保持有效。这些信息决定如何传值、失败时转到哪里处理，以及需要清理什么。Carven 先确定这些问题，再构造 C++ 实现。

<figure class="architecture-map">
  <ol class="architecture-pipeline">
    <li><span>01</span><strong>收集源码</strong><code>SourceBatch</code></li>
    <li><span>02</span><strong>建立语法树</strong><code>SyntaxProgram</code></li>
    <li><span>03</span><strong>检查与发布语义</strong><code>SemIRProgram</code></li>
    <li><span>04</span><strong>构造 C++ 结构</strong><code>TargetUnit</code></li>
    <li><span>05</span><strong>输出与原生构建</strong><code>C++ → 程序</code></li>
  </ol>
  <figcaption>编译器检查源语言契约并生成 C++；C++ 工具链负责原生编译、链接与优化。</figcaption>
</figure>

驱动将项目文件和标准库源码收集成一个源码批次，导入在该批次内解析。解析将源码批次构造成 `SyntaxProgram`，语义分析在 `ProgramDraft` 中完成声明和函数体，再发布检查后的 `SemIRProgram`。后端再根据检查结果生成 C++，原生工具链检查委托的 C++ 操作，并编译、链接和优化程序。

## 相同的分析流程，不同的命令行为

`check`、`interpret`、`compile` 和直接运行共享语义分析及必需的编译期工作。分析完成后，它们分别结束、进入执行器，或继续通过后端生成 C++。调用方式与输出见[编译器命令](/zh/reference/cli/)。

## 展开看三个关键交接

<details class="architecture-detail">
<summary>语法树 → 语义程序：先确定源契约</summary>

`ProgramDraft` 是完成声明和函数体的可变状态。它先预留身份，再完成函数体，因此支持前向引用和递归。随后求解类型与失败集合，检查完整函数体、异步使用、所有权和局部指针可空性。

成功分析会发布 `SemIRProgram`：由确定类型、结构化操作、存储关系和源码来源组成的不可变程序。这里的“发布”表示这些信息通过了所需检查，可以交给其他阶段使用。出现错误时不会进入下一阶段；警告可以随成功结果返回。

函数体完成后，分析还会确定哪些调用和 await 可能以取消完成。模板及完成的静态测试可以保留声明和源码来源，不保留运行时函数体。后端读取发布的程序，不再查询源语法树。

</details>

<details class="architecture-detail">
<summary>已检查操作 → 执行：在选定阶段运行</summary>

常量初始化器、`const` 块、静态测试和解释执行共享一套处理有类型值、控制流和存储的执行器。执行器应用资源预算，并根据执行中的实际值检查索引等操作。

各入口为执行器配置可用能力与执行宿主。编译期操作及结果保留规则见[常量参考](/zh/reference/constants/)，解释执行见[命令参考](/zh/reference/cli/#解释执行)。

</details>

<details class="architecture-detail">
<summary>语义程序 → C++：规划实现，再写出文本</summary>

`PlannedCompilation` 借用不可变语义程序，并拥有 `TargetPlan`。计划确定名称、接口分组、结果表示和产物位置。在制定计划和转换到目标表示（lowering）期间，语义程序必须保持存活，不能被移动。

每个产物分别维护 lowering 状态与目标类型缓存。`BodyPreparation` 借用已发布的函数体事实，推导操作计划和操作数需要哪些存储。`BodyRealizer` 及其片段构造目标语句和表达式，安排求值顺序、临时值、失败处理路径及清理；实现完成后才释放准备状态。例如，后一个字段初始化失败时，前一个已完成字段仍需要正确的析构路径。

`TargetUnitBuilder::finish` 收集头文件需求，根据产物引用与有序原生导入安排指令，形成完成的 `TargetUnit`。随后的输出阶段（emission）将结构和指令序列化为 C++ 文本，文件写出和原生工具链调用发生在更后面。

</details>

## 区分源规则与实现选择

| 源程序行为                                   | 生成必须保留什么                         |
| -------------------------------------------- | ---------------------------------------- |
| 处理分支恢复一种失败                         | 为调用者保留其他失败类型及其载荷         |
| 值借用了所有者的存储                         | 在每次必要使用和清理前保持存储有效       |
| 静态分支或循环特化函数                       | 生成选定工作，为展开迭代建立不同的局部值 |
| 表达式的值已知，但仍会修改状态或执行外部操作 | 即使值不需要运行时计算，也保留这些操作   |
| 隐式操作未通过检查                           | 保留让诊断能够解释问题的源码来源         |

语义分析确定什么有效，后端准备与实现阶段选择保留这些行为的实现。运行时支持提供原生操作，C++ 工具链完成其余原生检查和优化。

## 标准定义、产物与工作区查询

构建系统需要可复用的分析结果，编辑器需要当前源码的信息。两者使用同一条分析主线。

标准库分析可以在可执行程序之外保留泛型及分阶段函数的 `CheckedDefinitions`，消费者使用这些定义构造自己的实例。`compiler.artifact` 封装程序、可选定义、模块归属及是否可缓存。多个生成请求可以复用同一已检查程序，无需重复编译期工作。

工作区管理文档版本、解析快照、导航索引和有容量限制的分析缓存。没有可用缓存时，每次分析请求都执行完整的语义检查。错误后的查询可以保留已知源码信息，但不代表程序有效。到达输入、时钟读取或等待时，工作区给出诊断，避免编辑器分析实际读取输入、查询时钟或等待。

## 继续走进实现

- [内建能力与运行支持](/zh/internals/runtime-boundary/) 解释生成程序运行所需的支持。
- [C++ 生成与原生集成](/zh/features/cpp-generation/) 展示真实模块如何成为接口和实现。
- 仓库的[语义表示](https://github.com/ryblust/carven/blob/main/docs/compiler/analysis/semir.md)及[后端架构](https://github.com/ryblust/carven/blob/main/docs/compiler/backend/README.md)定义内部类型与阶段契约。
