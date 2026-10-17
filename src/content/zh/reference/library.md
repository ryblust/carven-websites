---
title: "标准能力索引"
description: "查找标准类型、函数、模块与执行契约。"
section: reference
lesson: 21
source: docs/language/standard.md
---

## 选择能力

按下表中的任务选择模块，再用 `import std::模块 using 名字;` 引入需要的声明。无论声明来自编译器还是 Carven 源码库，都使用相同导入方式。父模块不会自动打开子模块，选择函数也不会同时绑定其返回类型或失败类型的名字。

| 需求                                               | 模块                                                    | 参考                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 标量、数值解析、`String`、`Vector`、`Range` 与指针 | `std::core`                                             | [类型](/zh/reference/types/)、[复合类型](/zh/reference/aggregates/)、[文本](/zh/reference/text/)、[指针](/zh/reference/pointers/) |
| 输出、有界标准输入与字节分帧                       | `std::io`                                               | [输入与输出](/zh/reference/io/)                                                                                                   |
| 冷操作、汇合、竞速与词法子任务                     | `std::async`                                            | [异步](/zh/reference/async/)                                                                                                      |
| 时间间隔、单调时钟、等待与截止时间                 | `std::time`                                             | [时间](/zh/reference/time/)                                                                                                       |
| Unicode 转换、校验、分割与游标                     | `std::utf`                                              | [UTF](/zh/reference/utf/)                                                                                                         |
| 向量与掩码原语                                     | `std::simd`                                             | [SIMD](/zh/reference/simd/)                                                                                                       |
| 字节块、浮点块与字节集合扫描                       | `std::simd.bytes`、`std::simd.floats`、`std::simd.scan` | [SIMD](/zh/reference/simd/)                                                                                                       |
| 拥有所有权的 JSON 树、校验、解析与写出             | `std::json`                                             | [JSON](/zh/reference/json/)                                                                                                       |
| 宿主连接上的 TCP 读写                              | `std::net`                                              | [网络](/zh/reference/net/)                                                                                                        |
| 测试断言与报告                                     | `std::testing`                                          | [测试](/zh/reference/entry-testing/)                                                                                              |

## 默认名字与显式导入

核心标量及文本名字、`Vector`、`Range`、`assert`、`addressof`、输出函数、`stdin`、测试辅助函数与 SIMD 类型名默认可用。`Operation` 和异步、时间函数需要导入。所有这些名字都遵循普通查找与遮蔽规则；别名仍指向同一实体。

```carven
import std::core using String as Text;
import std::json using { Value, ValueError };
import std::async using when_all as join;

const config = Value::parse(r#"{"workers":4,"enabled":true}"#)?;

async fn title() -> Text => "analysis";
private async fn workers() -> i64 => config.get("workers")?.as_i64()?;

async fn main() throw ValueError {
    let (name, count) = await join(title(), workers())?;
    println(f"{name}: {count} workers");
}
```

程序输出 `analysis: 4 workers`。编译期保留 JSON 树及其拥有类型；两个冷操作在 await 时执行。`workers` 推导出的失败仍是汇合调用的契约，使用 `?` 传播。

## 执行与所有权

`const fn` 允许显式静态执行，普通调用仍在运行时执行。JSON、UTF、Vector、标量解析、浮点方法及受支持的异步、输入和时间操作，也能由编译期执行器和解释器运行，值与失败规则保持一致。静态输入及时间操作观察编译器宿主，使保留的分析结果不可缓存；步数预算不限制等待的实际时长。

拥有型常量保留 `String`、Vector、类与 JSON 的内容和类型。借用结果仍需有效后备存储；操作所有者不能冻结。C++ 实现及 TCP 网络操作需要原生执行。浏览器 Playground 的输入流为空，不加载这些原生实现，并受请求期限限制，见[工作流](/zh/learn/workflow/)。

Crafts 是由工具链或外部构建系统组装的源码包。路径、可见性、默认名字与局部别名见[模块](/zh/reference/modules/)；源码收集与保留产物见[命令行](/zh/reference/cli/)。
