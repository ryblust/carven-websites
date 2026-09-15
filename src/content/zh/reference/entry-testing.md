---
title: 入口、运行时测试与编译期测试
description: 入口选择、进程状态、check/require/fail 和测试停止传播。
section: reference
lesson: 16
source: docs/semantics.md
---

## 入口

一个编译批次最多一个程序入口，可以是名为 main 的函数，也可以是一个包含顶层可执行语句的文件。多个入口在各源位置诊断。生成 C++ 可以没有入口，执行程序必须有入口。

顶层语句按顺序组成隐式入口。声明可穿插其中；顶层 const 仍是模块常量，let/var 是入口局部变量，模块函数不能捕获它们。隐式入口没有源码 callable 名字、参数或声明失败集合，使用普通函数体的推断、访问、清理和失败处理规则。因此，顶层语句必须处理所有失败；需要声明向外失败时使用显式 main。

```carven
const heading = "Carven";
println(heading);
```

显式 main 的模块路径、craft 与可见性不影响选择。它可无参，或有一个无类型注解的 Read 命令行参数。该参数是入口专用不透明值，不是可索引/迭代序列。普通函数参数仍要求类型。

入口 outward 失败必须显式 throw，包括 private main。正常完成返回进程状态零；Carven 返回值即使是整数也不作为进程状态。typed failure 逃出入口产生 C++ EXIT_FAILURE，不自动打印载荷、不变成 C++ 异常，普通局部/返回值/载荷清理照常。捕获后正常完成返回零。

## 测试声明

`test "name" { ... }` 是模块局部无参数、无结果体。名字在模块内唯一，不能是 main。无论是否请求测试产物，测试都参与解析和语义检查；不得向外暴露失败。

```carven
fn add(a: i32, b: i32) -> i32 => a + b;

test "addition" {
    check(add(20, 22) == 42);
}
```

默认只分析普通测试；`compile --tests=default` 生成模块测试函数、runner 和默认入口，`--tests=external` 生成测试函数与 runner，由 C++ 消费者提供入口。

## 测试操作

```text
check(condition);
check(condition, message);
require(condition);
require(condition, message);
fail();
fail(message);
```

condition 必须是 bool；可选 message 是 str 或 String。实参个数、条件类型、消息类型分别用 `CV-TEST-ARGUMENT-COUNT`、`CV-TEST-CONDITION-TYPE`、`CV-TEST-MESSAGE-TYPE` 诊断。

条件先于消息求值，每个一次，即使条件成功也会求值消息。失败的 check 报告后继续；失败的 require 和 fail 报告并停止整个当前测试，包括嵌套 Carven helper 和 view。停止不同于 return、break 和 typed failure，try 捕获不到。普通清理完成后 runner 执行下一测试。该传播不能穿过任意原生 C++ 回调。

测试上下文由 runner 提供给同步 Carven 调用链，源码没有上下文实参。在没有活动测试的运行时调用测试操作违反运行时契约。builtin 遵守普通查找和遮蔽；本地名字、模块声明和显式 import 可遮蔽，原生 namespace wildcard 不遮蔽已知 builtin。作为值使用时需要具体 `fn(...) -> void` 上下文。

## 报告位置

失败报告包含原始 .cv 显示位置、操作名字的一基行号、操作种类和可选运行时消息。作为 callable 值使用时定位到 builtin 的绑定表达式。直接 check/require 还报告完整条件源码的 UTF-8 字节片段，含括号、空白、换行和注释。fail 无条件片段，最终呈现由 reporter 决定。

## const test

```carven
const fn square(value: i32) -> i32 => value * value;

const test "square at compile time" {
    check(square(6) == 36);
    println("checked");
}
```

const test 在语义分析完成 body 构建后执行一次，与测试产物开关无关。使用常量执行准入子集，直接 const fn、打印和测试操作可用；不活动分支也接受准入检查。每个测试拥有独立存储和预算，按输入批次模块顺序及模块内源码顺序执行。通过的 const test 不生成运行时测试函数或 runner 项。

失败 check 是编译错误但继续当前测试；失败 require/fail、执行错误或预算耗尽停止当前测试，后续 const test 仍执行。失败消息文本计入累计文本工作预算。普通必需常量初始化器没有活动测试，执行测试操作会被拒绝。

常量测试验证编译期执行的语义操作，运行时测试验证生成 C++ 与原生行为。
