---
title: "标准 API 索引"
description: "按类型、操作和模块查找内建与源码定义的标准 API。"
section: reference
lesson: 20
source: docs/language/standard.md
---

## 内建类型与操作

**内建（built-in）** 表示类型或操作的语义由编译器定义，包括类型、访问、生命周期、失败和执行规则。它属于哪个标准模块、名字是否默认可见，是另外两个属性：`String` 是 `std::core` 的默认绑定，`Operation` 和 `when_all` 则需要从 `std::async` 显式导入。

具名内建能力遵循普通名字查找，可以被遮蔽。绑定与导入规则见[标准模块与默认名字](/zh/reference/modules/#标准模块与默认名字)。

| 分类                 | 参考                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| 标准输出与错误输出   | [`print`、`println`、`eprint`、`eprintln`](/zh/reference/formatting/#打印) |
| 运行时断言           | [`assert`](/zh/reference/entry-testing/#assert)                            |
| 测试断言与停止       | [`check`、`require`、`fail`](/zh/reference/entry-testing/#测试操作)        |
| 取地址               | [`addressof`](/zh/reference/pointers/#使用-addressof-取地址)               |
| 文本查询与修改       | [`str` 与 `String`](/zh/reference/text/)                                   |
| 序列查询与视图       | [数组与切片](/zh/reference/slices/#切片操作)                               |
| 向量与掩码操作       | [SIMD 原语](/zh/reference/simd/)                                           |
| 标量类型与转换       | [数值、布尔、字符与单元类型](/zh/reference/types/#标量类型)                |
| 动态数组             | [`Vector<T>`](/zh/reference/aggregates/#动态数组-vector)                   |
| 数值解析             | [解析方法与失败](/zh/reference/types/#数值文本解析)                        |
| 需导入的异步内建能力 | [Operation、组合、取消与关闭](/zh/reference/async/)                        |
| 需导入的超时内建操作 | [超时组合](/zh/reference/time/#截止时间组合)                               |

## 试用完整程序

原生项目教程给出完整文件和本地命令。浏览器示例可打开后直接执行，再修改输入观察结果；异步测试选择「测试」操作。

| 任务                               | 完整示例                                               | 规则与讲解                                                               |
| ---------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| 构建普通应用并运行同文件内联测试   | [构建原生项目](/zh/learn/build/)                       | [构建与查询 API](/zh/reference/build/)                                   |
| 解析 TOML，并用哈希集合汇总        | [TOML 配置汇总](/zh/playground/#example=toml-summary)  | [TOML](/zh/reference/toml/)、[集合](/zh/reference/collections/)          |
| 在编译期与运行时调用闭包策略       | [闭包策略](/zh/playground/#example=closure-policy)     | [闭包](/zh/learn/closures/)、[静态执行](/zh/reference/constants/)        |
| 通过有界通道传递拥有型字节         | [生产与消费](/zh/playground/#example=channel-pipeline) | [字节通道](/zh/reference/channel/)、[异步](/zh/learn/async/)             |
| 在浏览器文件系统中写入并读取报告   | [文件报告](/zh/playground/#example=file-report)        | [文件与路径](/zh/reference/fs/)                                          |
| 运行等待子任务的测试               | [异步测试](/zh/playground/#example=async-tests)        | [测试](/zh/learn/testing/)、[异步测试契约](/zh/reference/entry-testing/) |
| 从网页调用源码函数，并测试业务规则 | [交互式定价](/zh/playground/#example=pricing-preview)  | [原生与宿主执行](/zh/reference/interop/)、[内联测试](/zh/learn/testing/) |
| 提供文本和文件，再下载生成的报告   | [输入与文件](/zh/playground/#example=workspace-report) | [标准输入](/zh/reference/io/)、[文件](/zh/reference/fs/)                 |

[交互式定价项目](/zh/playground/#example=pricing-preview)会在多次调用之间保留宿主会话。修改金额和折扣会自动更新报价；源码修改通过「更新预览」检查并应用。有效源码会替换实现；源码检查失败时，上一版仍可处理新输入。「生成的文件」只在文件示例或实际产生文件后出现。产物留在内存中，只有点击「下载」才保存到电脑，也不会写入项目草稿。每个示例拥有独立的文件和草稿，以 `main.cv` 为程序入口。可以通过文件树或标签切换文件，也可以使用建议文件名或相对路径添加文件。

本地项目继续使用同一语言：先看[声明式构建](https://github.com/ryblust/carven/tree/v0.1.0/examples/build/declarative)，再看[读取 TOML、生成源码和组装构建计划](https://github.com/ryblust/carven/tree/v0.1.0/examples/build/imperative)。[构建 API](/zh/reference/build/)说明目标、依赖和查询；[工具工作流](/zh/learn/workflow/)给出使用步骤。

## 按模块查找

按任务选择模块。下表同时列出编译器内建能力与源码定义的标准 API。

| 需求                                                       | 模块                                                    | 参考                                                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 标量、数值解析、`String`、`Vector`、`Range` 与 `addressof` | `std::core`                                             | [类型](/zh/reference/types/)、[复合类型](/zh/reference/aggregates/)、[文本](/zh/reference/text/)、[指针](/zh/reference/pointers/) |
| 输出、有界标准输入与字节分帧                               | `std::io`                                               | [输入与输出](/zh/reference/io/)                                                                                                   |
| 冷操作、汇合、竞速与子任务                                 | `std::async`                                            | [异步](/zh/reference/async/)                                                                                                      |
| 时间间隔、单调时钟、等待与截止时间                         | `std::time`                                             | [时间](/zh/reference/time/)                                                                                                       |
| Unicode 转换、校验、分割与游标                             | `std::utf`                                              | [UTF](/zh/reference/utf/)                                                                                                         |
| 向量与掩码原语                                             | `std::simd`                                             | [SIMD](/zh/reference/simd/)                                                                                                       |
| 字节块、浮点块与字节集合扫描                               | `std::simd.bytes`、`std::simd.floats`、`std::simd.scan` | [SIMD](/zh/reference/simd/)                                                                                                       |
| 拥有所有权的 JSON 树、校验、解析与写出                     | `std::json`                                             | [JSON](/zh/reference/json/)                                                                                                       |
| 宿主连接上的 TCP 读写                                      | `std::net`                                              | [网络](/zh/reference/net/)                                                                                                        |
| 测试断言与报告                                             | `std::testing`                                          | [测试](/zh/reference/entry-testing/)                                                                                              |
| 拥有型映射、集合、哈希和字节摘要                           | `std::collections`                                      | [集合](/zh/reference/collections/)                                                                                                |
| 异步任务间的有界消息                                       | `std::channel`                                          | [通道](/zh/reference/channel/)                                                                                                    |
| 文件、目录和路径                                           | `std::fs`                                               | [文件系统](/zh/reference/fs/)                                                                                                     |
| 宿主查询和子进程                                           | `std::process`                                          | [进程](/zh/reference/process/)                                                                                                    |
| 拥有型 TOML 树及借用遍历                                   | `std::toml`                                             | [TOML](/zh/reference/toml/)                                                                                                       |
| 原生构建计划、项目发现与编译                               | `std::build`, `std::compiler`                           | [项目构建](/zh/reference/build/)                                                                                                  |

`[T]`、`(A, B)`、`ptr<T>`、`fn(...) -> R` 等结构性类型形式属于语言语法，入口见[类型目录](/zh/reference/types/#标量类型)，不通过模块导入选择。

## 默认名字与显式导入

[标准模块与默认名字](/zh/reference/modules/#标准模块与默认名字)说明模块归属、声明来源、默认绑定与显式导入。下面的示例从多个模块导入名字并使用别名：

```carven run
import std::async using when_all as join;
import std::core using String as Text;
import std::json using { JSONValue, JSONValueError }

const config = JSONValue::parse(r#"{"workers":4,"enabled":true}"#)?;

async fn title() -> Text => "analysis";
private async fn workers() -> i64 => config.get("workers")?.as_i64()?;

async fn main() throw JSONValueError {
    let (name, count) = await join(title(), workers())?;
    println(f"{name}: {count} workers");
}
```

程序输出 `analysis: 4 workers`。

## 执行与所有权

各能力页说明支持的执行阶段及结果所有权。[编译期计算](/zh/reference/constants/)说明 `const fn`、常量结果与预算；[异步](/zh/reference/async/)说明操作的生命周期；[工作流](/zh/learn/workflow/)说明 Playground 执行方式。

Standard Craft、内建能力与 Runtime Craft 的分工见[内建能力与运行支持](/zh/internals/runtime-boundary/)。

[模块](/zh/reference/modules/)说明 Craft 路径与可见性；[命令行](/zh/reference/cli/)说明源码收集与保留产物。
