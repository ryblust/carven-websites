---
title: 语言参考
description: 按关键字、语法、类型和标准库查阅当前 Carven 的写法与规则。
section: reference
lesson: 0
source: docs/language/README.md
---

## 参考入口

<div class="reference-entry-grid">
<a class="reference-entry" href="#查找语法与规则"><strong>语言语法</strong><span>关键字、变量、类型、表达式与控制流</span></a>
<a class="reference-entry" href="/zh/reference/library/"><strong>标准 API 索引</strong><span>按类型、操作和模块查找内建与源码定义的 API</span></a>
<a class="reference-entry" href="/zh/reference/diagnostics/"><strong>诊断代码</strong><span>按错误码查找编译器错误、警告及对应规则</span></a>
</div>

## 查找语法与规则

需要循序渐进的介绍时，使用[教程](/zh/learn/)；要了解设计选择与实现，阅读[设计与原理](/zh/design/)。

| 要查什么                                                         | 从这里开始                                                                                                                                                                                                              |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `let`、`var`、`const` 怎么声明                                   | [变量声明与作用域](/zh/reference/bindings/)                                                                                                                                                                             |
| `+`、`&&`、`as`、`..` 怎么求值                                   | [运算符与表达式](/zh/reference/operators/)、[类型与转换](/zh/reference/types/)                                                                                                                                          |
| `if`、`while`、`for`、`match` 怎么写                             | [分支、循环与控制转移](/zh/reference/control/)                                                                                                                                                                          |
| `fn`、参数、返回值、捕获 `[value]` / `[&value]`                  | [函数](/zh/reference/functions/)、[闭包](/zh/reference/closures/)                                                                                                                                                       |
| `struct`、`class`、`enum`、数组与 `Vector<T>`                    | [复合类型](/zh/reference/aggregates/)                                                                                                                                                                                   |
| 类型形式 `()`、`(T,)`、`[T; N]`、`[T]`、`ptr<T>`、`fn(...) -> R` | [标量与复合类型目录](/zh/reference/types/#标量类型)、[元组](/zh/reference/aggregates/#元组)、[切片](/zh/reference/slices/)、[指针](/zh/reference/pointers/)、[可调用视图](/zh/reference/closures/#可调用视图与生命周期) |
| 参数 `<T>` 与 `<T, throw E>`                                     | [参数化函数](/zh/reference/functions/#参数化函数)、[参数化类型](/zh/reference/types/#名义类型参数)、[失败集合参数](/zh/reference/failures/#失败集合参数)                                                                |
| 模式 `is T`、`\|`、`&name`、`..`                                 | [match 与模式](/zh/reference/control/#match-与模式)、[整数区间模式](/zh/reference/control/#整数区间模式)                                                                                                                |
| `async fn`、`async let`、`await`、`cancel`                       | [操作](/zh/reference/async/#冷操作与-await)、[组合](/zh/reference/async/#冷组合)、[子任务与取消](/zh/reference/async/#作用域内的子任务与取消)                                                                           |
| 限定名 `Type::name`、`::native` 与元组字段 `.0`                  | [关联与原生名字](/zh/reference/operators/#运算符总览)、[位置字段](/zh/reference/aggregates/#元组)                                                                                                                       |
| `&`、`&&`、借用、`ptr<T>`、`*p`、`p->member`                     | [访问与所有权](/zh/reference/ownership/)、[切片](/zh/reference/slices/)、[指针](/zh/reference/pointers/)                                                                                                                |
| `throw`、`try`、`catch`、`?`                                     | [失败契约](/zh/reference/failures/)                                                                                                                                                                                     |
| 文本字面量 `"..."`、`r#"..."#`、`"""..."""`、`f"..."`            | [字符与文本](/zh/reference/text/)、[格式化与输出](/zh/reference/formatting/)                                                                                                                                            |
| `import`、`using`、`export`、`private`                           | [模块与可见性](/zh/reference/modules/)                                                                                                                                                                                  |
| `const fn`、静态参数与静态控制                                   | [编译期计算](/zh/reference/constants/)、[函数](/zh/reference/functions/#静态参数)                                                                                                                                       |
| `main`、`test`、断言                                             | [入口与测试](/zh/reference/entry-testing/)                                                                                                                                                                              |
| C++ 头文件、`c"..."`、`import(cpp)`、`export(cpp)`、`#[cpp]`     | [C++ 互操作](/zh/reference/interop/)                                                                                                                                                                                    |

知道具体拼写时，可以先查[关键字索引](/zh/reference/keywords/)。顶部「搜索文档」可以按标题、主题、关键字或常用符号查找，例如 `let`、`break`、`?`。

## 默认规则与上下文行为

一些效果由已知类型或外围边界决定。遇到「这句代码还会做什么」的问题，可以从下面这些规则查起。

| 场景                                         | 要核对的规则                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 特殊名字在某个位置合法，在另一个位置被拒绝   | [保留与上下文拼写](/zh/reference/keywords/)                                                                                      |
| 省略类型或使用前导 `.Case`、`{ ... }`        | [局部期望类型规则](/zh/reference/types/#期望类型)、[上下文构造](/zh/reference/aggregates/#上下文构造)                            |
| 把 String 或数组用在需要借用视图的位置       | [上下文适配](/zh/reference/types/#上下文适配)，以及借用的生命周期                                                                |
| 后面的实参修改了前面的 Read 实参存储         | [Read 值与别名](/zh/reference/ownership/#read-值与别名)                                                                          |
| 返回具名所有者，或用它初始化另一个所有者     | [复制与显式 Take](/zh/reference/ownership/#take-与可用性)                                                                        |
| catch 列表只覆盖部分失败                     | [try 边界的剩余失败传播](/zh/reference/failures/#部分捕获与剩余集合)                                                             |
| 具名文本或切片视图后面不再使用               | [文本借用持续时间](/zh/reference/text/#借用与修改)、[切片持续时间](/zh/reference/slices/#借用持续时间)；最后一次使用不会结束借用 |
| 用字面量实参调用 `const fn`                  | [编译期能力](/zh/reference/functions/#编译期能力)；普通调用仍在运行时执行                                                        |
| 常量结果包含 String 或数组的底层存储         | [常量结果与底层存储](/zh/reference/constants/#常量结果与底层存储)                                                                |
| 用 `{}` 初始化值，或把代码放在 `if false` 后 | [默认初始化](/zh/reference/aggregates/#默认初始化)、[未执行代码的检查](/zh/reference/control/#顺序与不活动代码)                  |

## 标准库、工具链与附录

用[标准 API 索引](/zh/reference/library/)选择文本、SIMD、异步、时间、输入、JSON 和网络 API。[编译器命令](/zh/reference/cli/)和[构建与原生集成](/zh/reference/toolchain/)说明如何调用工具、生成和接入产物。

[形式语法附录](/zh/reference/grammar/)列出完整 EBNF；[诊断目录](/zh/reference/diagnostics/)帮助按编译器代码定位错误。

## 如何阅读例子

文中的「编译错误」表示程序会被 Carven 拒绝；「终止」表示执行结束，不能被捕获为类型化失败。

完整示例的代码框如果有「运行」按钮，可以直接执行，输出会显示在代码下方。

本地环境与运行命令见[第一个程序](/zh/learn/first-program/)；测试示例的运行方式见[测试声明](/zh/reference/entry-testing/#测试声明)。局部片段和语法模板需要相应上下文。

## 术语

| 术语                | 含义                                                     |
| ------------------- | -------------------------------------------------------- |
| 名义类型            | 由结构体、类或枚举的声明身份决定的类型                   |
| 值                  | 一次计算的结果                                           |
| 存储位置            | 可读取或写入的对象、字段、元素或指针目标                 |
| 所有者              | 负责值的生命周期与清理的绑定或外围值                     |
| Read / Write / Take | 读取、不接收所有权的可写访问、所有权转移                 |
| 底层存储            | 为切片、文本视图等提供实际存储的对象                     |
| 完整表达式          | 一次表达式求值，以及通常保留到该表达式结束才清理的临时值 |
| 正常完成            | 求值产生成功结果或执行到下一条语句                       |
| 类型化失败          | 函数没有成功返回时携带的结构体或枚举值，可传播或捕获     |
| 公开接口            | 模块外可以访问的声明及其类型信息                         |

## 规则的适用边界

Carven 检查已知 Carven 存储的可用性、访问标记和借用关系。对于外部地址的存活、C++ 指针保留、迭代器失效、重入及原生未定义行为，提供者和调用者须遵守相应的 C++ 契约。

外部存储与并发的责任边界，见 [C++ 访问与生命周期](/zh/reference/interop/#访问与生命周期)。
