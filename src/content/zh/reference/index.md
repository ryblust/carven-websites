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
<a class="reference-entry" href="/zh/reference/builtins/"><strong>内建函数与类型 API</strong><span>无需导入的输出、断言、文本与序列操作</span></a>
<a class="reference-entry" href="/zh/reference/library/"><strong>标准库参考</strong><span>按模块查阅 UTF 与 SIMD 的签名和契约</span></a>
</div>

## 查找语法与规则

本手册描述当前 Carven 已实现的语言。写代码时，可以按关键字、语法类别或类型找到具体形式、最小示例、执行规则和限制。[教程](/zh/learn/)按任务带你写程序；[设计与原理](/zh/design/)说明设计选择与实现。

| 要查什么                               | 从这里开始                                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `let`、`var`、`const` 怎么声明         | [变量声明与作用域](/zh/reference/bindings/)                                                              |
| `+`、`&&`、`as`、`..` 怎么求值         | [运算符与表达式](/zh/reference/operators/)、[类型与转换](/zh/reference/types/)                           |
| `if`、`while`、`for`、`match` 怎么写   | [分支、循环与控制转移](/zh/reference/control/)                                                           |
| `fn`、参数、返回值与闭包               | [函数](/zh/reference/functions/)、[闭包](/zh/reference/closures/)                                        |
| `struct`、`class`、`enum` 与数组       | [复合类型](/zh/reference/aggregates/)                                                                    |
| `&`、`&&`、借用与指针                  | [访问与所有权](/zh/reference/ownership/)、[切片](/zh/reference/slices/)、[指针](/zh/reference/pointers/) |
| `throw`、`try`、`catch`、`?`           | [失败契约](/zh/reference/failures/)                                                                      |
| 字符串、原始与多行文本、插值           | [字符与文本](/zh/reference/text/)、[格式化与输出](/zh/reference/formatting/)                             |
| `import`、`using`、`export`、`private` | [模块与可见性](/zh/reference/modules/)                                                                   |
| `const fn`、静态参数与静态控制         | [编译期计算](/zh/reference/constants/)、[函数](/zh/reference/functions/#静态参数)                        |
| `main`、`test`、断言                   | [入口与测试](/zh/reference/entry-testing/)                                                               |
| C++ 头文件、函数与源片段               | [C++ 互操作](/zh/reference/interop/)                                                                     |

知道具体拼写时，可以先查[关键字索引](/zh/reference/keywords/)。左侧「查找章节」也接受关键字和常用符号，例如 `let`、`break`、`?`。

## 默认规则与上下文行为

一些效果由已知类型或外围边界决定。遇到「这句代码还会做什么」的问题，可以从下面这些规则查起。

| 场景                                         | 要核对的规则                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 特殊名字在某个位置合法，在另一个位置被拒绝   | [保留与上下文拼写](/zh/reference/keywords/)                                                                                      |
| 省略类型或使用前导 `.Case`、`{ ... }`        | [局部期望类型规则](/zh/reference/types/#期望类型)、[上下文构造](/zh/reference/aggregates/#上下文构造)                            |
| 把拥有文本或数组放入期望视图的位置           | [上下文适配](/zh/reference/types/#上下文适配)，以及借用的寿命                                                                    |
| 后面的实参修改了前面的 Read 实参存储         | [Read 值与别名](/zh/reference/ownership/#read-值与别名)                                                                          |
| 返回具名 owner，或用它初始化另一个 owner     | [复制与显式 Take](/zh/reference/ownership/#take-与可用性)                                                                        |
| catch 列表只覆盖部分失败                     | [try 边界的剩余失败传播](/zh/reference/failures/#部分捕获与剩余集合)                                                             |
| 具名文本或切片视图后面不再使用               | [文本借用持续时间](/zh/reference/text/#借用与修改)、[切片持续时间](/zh/reference/slices/#借用持续时间)；最后一次使用不会结束借用 |
| 用字面量实参调用 `const fn`                  | [编译期能力](/zh/reference/functions/#编译期能力)；普通调用仍在运行时执行                                                        |
| 常量产生拥有文本或数组 backing               | [准入与冻结](/zh/reference/constants/#准入与冻结)                                                                                |
| 用 `{}` 初始化值，或把代码放在 `if false` 后 | [默认初始化](/zh/reference/aggregates/#默认初始化)、[未执行代码的检查](/zh/reference/control/#顺序与不活动代码)                  |

## 标准库、工具链与附录

[UTF 标准库](/zh/reference/utf/)和[SIMD](/zh/reference/simd/)说明库与向量操作。[编译器命令](/zh/reference/cli/)和[构建与原生集成](/zh/reference/toolchain/)说明如何调用工具、生成和接入产物。

[形式语法附录](/zh/reference/grammar/)列出完整 EBNF；[诊断目录](/zh/reference/diagnostics/)帮助按编译器代码定位错误。

## 如何阅读例子

先看要使用的语法形式，再看该操作的类型、访问、失败和生命周期规则。文中的「编译错误」表示程序应被 Carven 拒绝；「终止」表示执行结束，不能被捕获为类型化失败。

没有另行标注时，完整示例单独保存为 `main.cv`，使用 `carven main.cv` 原生运行；编译错误示例单独用 `carven check main.cv` 检查。局部片段和语法模板需要相应上下文，不要将多个独立示例拼接为一个程序。`test` 示例使用 `carven --tests main.cv`；`const test` 在检查期间执行。更多运行步骤见[第一个程序](/zh/learn/)。

## 术语

规则页会在需要时使用下列术语。类型说明值是什么；访问说明怎样使用存储；所有权决定值何时结束生命周期；失败契约说明调用可能传播哪些失败。

| 术语                | 含义                                     |
| ------------------- | ---------------------------------------- |
| 名义类型            | 由结构体、类或枚举的声明身份决定的类型   |
| 值                  | 一次计算的结果                           |
| 存储位置            | 可读取或写入的对象、字段、元素或指针目标 |
| owner               | 拥有立即值并负责其作用域生命周期的绑定   |
| Read / Write / Take | 读取、非拥有可写访问、所有权转移         |
| backing             | 为切片、文本视图等提供实际存储的对象     |
| 完整表达式          | 临时值通常所属的求值与清理边界           |
| 正常完成            | 求值产生成功结果或执行到下一条语句       |
| typed failure       | 携带名义类型载荷的可恢复控制效果         |
| 发布接口            | 模块外可以访问的声明及其类型信息         |

## 规则的适用边界

Carven 检查已知 Carven 存储的可用性、访问标记和借用关系。对于外部地址的存活、C++ 指针保留、迭代器失效、重入及原生未定义行为，提供者和调用者须遵守相应的 C++ 契约。

当前源语言没有 async/await、线程创建或同步、原子操作、并发内存模型、用户定义泛型、trait、继承、虚派发、源级析构器或自定义复制/移动钩子，也没有通用引用类型。Read/Write/Take 不建立跨线程安全。指针和 C++ 接入的存在不授予这些能力。本文说明已实现的同步求值与生命周期规则。
