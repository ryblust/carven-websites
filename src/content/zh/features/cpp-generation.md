---
title: "C++ 生成与集成"
description: "通过流收集器理解生成的头文件、实现，以及其中的所有权和清理。"
section: cpp-generation
source: docs/compiler/backend/README.md
---

## 用一份源码维护接口和实现

模块的数据或函数签名变化后，C++ 工程需要让声明、定义和调用者保持一致。Carven 根据模块中已检查的类型和函数生成头文件与实现，交给你的 C++ 工具链编译、链接和优化。

流收集器会返回包含独立记录数据的报告，可以用它了解生成结果：

```carven
export struct Report {
    records: Vector<String>,
    total: usize,
    duplicates: usize
}
```

C++ 提供方返回的文本视图只在下一次读取前有效。Carven 把需要保留的记录复制成 `String`，去除重复项，再返回完整报告。`import(cpp)` 声明提供方操作，`export(cpp)` 将收集函数暴露给宿主。[完整源码](https://github.com/ryblust/carven/blob/main/examples/stream_collector/workflow.cv) 展示两个方向。

## 接入现有 C++ 工程

流提供方使用 `import(cpp)`，收集入口使用 `export(cpp)`。这些声明、头文件导入和内联 C++ 片段的完整语法见[互操作参考](/zh/reference/interop/)。

`export(cpp)` 函数获得 `carven/api/<规范模块路径>.hpp` 下的自包含 API 头文件。宿主包含它，在对应的 `carven::api` 模块命名空间调用函数。具体 `import(cpp)` 声明还会获得 `carven/providers` 头文件，为签名类型提供别名；提供方声明和实现仍由 C++ 编写。

完整示例包含 C++ 宿主和 provider。按[流收集器的构建说明](https://github.com/ryblust/carven/tree/main/examples/stream_collector)构建并运行该项目。

宿主在收集期间保留流资源，接收含独立字符串的报告。Xmake 组织源码生成、原生编译和链接。手工构建命令与原生支持要求见[工具链参考](/zh/reference/toolchain/)。

## 清理部分初始化的对象

假设聚合的第一个字段已经成功构造，第二个字段却失败了。求值第二个字段时，第一个值必须保持有效；进入失败路径后，它又需要被清理。生成的 C++ 通过临时值、作用域和结果构造保留这些行为。

这些临时值保留[所有权与求值规则](/zh/reference/ownership/)要求的行为。原生组件类型需要支持生成的构造过程实际使用的复制或移动。

## 根据类型依赖组织头文件

有些声明必须看到另一个类型的完整定义。编译器把由这些要求连接的模块组合成接口组件，其他关系使用前置声明。仅函数体需要的依赖留在实现文件中，因此私有函数体修改可以不改变公开头文件。

生成前，分析检查源类型、访问、所有权、失败集合和异步使用。后端根据已检查程序选择表示并构造 C++ 语法。原生重载、模板、布局和机器码优化由 C++ 工具链负责。[架构文章](/zh/internals/compiler-architecture/) 详细解释各阶段的交接。

## 导出异步入口

`export(cpp) async fn` 在生成 API 中暴露 `AsyncOperation`。宿主用 `drive_root(operation, &source)` 启动导出的顶层异步操作，提供事件源，并在该操作及其子任务结束前保留原生资源。生成实现使用 C++ 协程。

[内建能力与运行支持](/zh/internals/runtime-boundary/)说明驱动器与提供方清理。原生异常的处理规则见 [noexcept 边界](/zh/reference/interop/#noexcept)。

## 复用已检查程序与已知值

已知访问决定传参和清理，已知结果位置可能允许直接构造。静态参数在运行前选择分支、展开迭代。已知的格式结构和已验证的编码信息，可以用于提前准备输出，避免反复解析同一格式。

这些实现选择仍保留必要的求值、状态修改、外部操作和生命周期。同一份已发布语义程序还能生成普通和测试产物，无需重复编译期工作。保留的分析目录可继续交给 `compile`，产物契约见[工具链参考](/zh/reference/toolchain/)。
