---
title: 生成的程序，如何连接 C++ 世界
description: 看清语言 runtime、标准与用户 Crafts、原生库，以及编译和链接各自的边界。
section: internals
source: docs/compiler/README.md
---

## 生成代码需要哪些支持

Carven 将检查过的语义生成 C++。生成程序中的数值、文本、失败结果和可调用对象需要相应的原生实现；这些共享设施位于 `crafts/carven/runtime/`。标准与用户 Crafts 则组织库的 API、算法和可选的 C++ 实现支持。

<figure class="architecture-map">
  <div class="runtime-map">
    <div class="runtime-map-source"><strong>Carven 程序 · 标准与用户 Crafts</strong><span>.cv 源模块</span></div>
    <div class="runtime-map-generated"><strong>生成的 C++</strong><span>接口、实现与所需依赖</span></div>
    <div class="runtime-map-dependencies"><div><strong>语言 runtime</strong><span>共享的原生操作支持</span></div><div><strong>原生库与实现方</strong><span>已有 C++ 类型和调用</span></div></div>
  </div>
  <figcaption>原生工具链编译生成文件、Crafts 的 .cpp 支持与其他所需 C++ 源文件，并链接依赖库。</figcaption>
</figure>

编译器源码不包含 runtime 头文件。后端通过符号元数据描述生成代码需要的依赖，再在产物中安排相应头文件。runtime 提供语言设施；它不依赖标准 Crafts，也不求解源程序的类型、所有权或失败契约。

## 每一层负责什么

| 层             | 职责                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------- |
| 编译器         | 检查语义、执行允许的静态计算、发布事实、生成 C++                                            |
| 语言 runtime   | 提供数值、数组与切片、文本与 String、格式化、失败结果、可调用对象、检查和测试等共享原生支持 |
| 标准 Crafts    | 用普通 Carven 模块组织库 API 和算法；当前包含 UTF 与 SIMD 辅助能力                          |
| 用户 Crafts    | 使用与标准 Crafts 相同的类型、所有权、静态执行和发布规则，拥有自己的 API 与实现             |
| C++ 库与实现方 | 提供原生类型、函数与实现，并承担外部对象及调用的契约                                        |
| 原生构建系统   | 准备源文件、包含路径、库和选项，完成编译、链接和增量构建                                    |

因此，接入一个库不必变成新的编译器内建。库可以通过 Craft 声明和原生实现接入，再沿相同的语义检查与生成流程构建。

## 展开看生成代码与 runtime 的交互

<details class="architecture-detail">
<summary>失败结果：静态集合，具体的原生载体</summary>

语义分析计算失败集合，并检查恢复后剩余的契约。有失败契约的函数使用具体的 `Outcome<Result, Failures...>` 表示；不受失败或测试停止影响的函数直接返回结果。

内部允许测试停止的可调用对象还使用独立的 `TestStopped` 传输，它不属于声明的失败集合。面向 C++ 的 导出桥接 会将其移除，逸出的测试停止会终止程序。

当前 runtime 的 `Outcome` 存储使用 `std::variant`。后端安排传播、载荷传递、清理和恢复分支。这里的容器是当前实现细节；源语言的承诺是保留失败类型、数据和求值行为。

C++ 异常不自动成为 Carven 失败。逃出生成函数及相应桥接的 `noexcept` 边界会终止程序。需要恢复的原生异常，应由适配层捕获，再明确选择恢复值或失败结果。

</details>

<details class="architecture-detail">
<summary>读取与转移：源语言权限，原生存储与传参</summary>

Read、Write、Take 先由 Carven 检查，再依据存储性质生成传参。Read 保留数组、String 和闭包的 backing；纯 Carven 快照值可以按值传递。包含原生值时，C++ 的复制与析构性质参与表示选择。Write 使用可写引用，Take 接收拥有的值并按转移策略构造。

常量执行中的临时存储也有明确的完成规则。构造的 String 可以冻结为 规范化的 `str`；切片的元素被保存为常量身份，由后端建立模块拥有的常量数组 backing。编译器宿主内存的地址不会直接变成目标程序的常量地址。

这些安排保留源程序所要求的观察时点与生命周期。外部 C++ 指针指向的对象是否有效、库是否保留引用，仍需要原生边界的契约。

</details>

<details class="architecture-detail">
<summary>SIMD：逻辑通道，按目标选择实现</summary>

Carven 的逻辑向量形状与某一个硬件寄存器分开。静态执行处理拥有的通道值；原生执行在编译期选择 NEON、消费者明确启用的 AVX2，或可移植的通道实现。

宽向量在 NEON 上可以使用两个寄存器，在 AVX2 上使用一个寄存器。当前选择没有运行时派发；相关翻译单元需要一致的后端选项。具体收益由目标机器和工作负载决定。

</details>

## 四种不同的 C++ 接入位置

| 入口          | 如何参与生成与检查                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| 头文件导入    | 生成 include；显式 `using` 引入外部名称或命名空间查找环境。Carven 不解析头文件，外部名称、成员、模板和转换由 C++ 检查 |
| `import(cpp)` | 声明由 C++ 实现方提供的 Carven 能力；Carven 不生成 实现方的声明，也不比较其 C++ 签名                                  |
| `export(cpp)` | 为普通 Carven 函数生成面向 C++ 的 API 头文件与导出桥接，位于 `carven::api` 的模块命名空间中                           |
| `#[cpp]`      | 将不透明的 C++ 源片段放进实现产物，不发布头文件声明，也不包住生成的 Carven 函数体                                     |

原生调用继续使用 C++ 的重载、模板和构造规则。Carven 能检查它掌握的访问与存活关系；未知别名、对象保留、重入和外部生命周期由实现方与调用者约定。

## 从产物到可执行程序

`carven compile` 写出生成的接口和实现，也包含收集到的 Crafts 模块产物；它不编译或复制收集到的原生 `.cpp` 文件。手动构建需要将这些源文件和依赖一同交给 C++ 工具链。

直接运行 `carven main.cv` 时，驱动会将生成实现与收集到的原生源文件一起编译、链接并执行。生成程序与安装的 Crafts 的最低基线为 C++20，消费者可以选择更新的标准；构建 Carven 编译器自身所需的宿主工具链是另一层要求。

- [C++ 生成文章中的宿主程序](/zh/features/cpp-generation/#接回现有的-c-工程)展示了 API 头文件与链接方式。
- [C++ 互操作教程](/zh/learn/interop/)从第三方库调用开始。
- 主仓库的[互操作规则](https://github.com/ryblust/carven/blob/main/docs/language/interop.md)、[构建与产物](https://github.com/ryblust/carven/blob/main/docs/toolchain/artifacts.md)与[标准 Crafts](https://github.com/ryblust/carven/blob/main/crafts/carven/std/README.md)描述进一步的边界。
