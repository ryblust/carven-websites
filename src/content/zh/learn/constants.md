---
title: 编译期计算与静态测试
description: 用 const fn 组织循环和文本构造，认识冻结和执行阶段。
section: learn
lesson: 11
source: docs/semantics.md
---

## 准备一个静态标题

```carven
const fn title(value: i32) -> String {
    println("Preparing title");
    return f"Build {value:04}";
}

const heading = title(42);

const test "heading" {
    check(heading == "Build 0042");
}

fn main() {
    println(heading);
}
```

使用 `carven main.cv` 时，编译阶段输出 `Preparing title`，随后启动的程序输出 `Build 0042`。单独运行已生成的可执行文件只输出 `Build 0042`。heading 的最终类型是 str；String 在计算时拥有内容，在常量初始化完成时冻结为静态文本。

## const fn 不意味着每次编译期运行

普通运行时表达式中的 `title(42)` 仍是普通函数调用。声明 const fn 只是让它具备必需常量执行资格；只有 const 初始化、数组长度、const test 等上下文要求编译期执行。

const fn 内可以写局部变量、循环、支持的数组和结构体以及 String 操作；普通 const 初始化器不能直接用任意控制流表达式，复杂逻辑放进 const fn。

## 静态表格

```carven
const table: [i32] = [2, 4, 6];
const middle = table.slice(1usize, 3usize);

fn main() {
    println(middle.len(), middle[0]);
}
```

输出 `2 4`。这是具有静态 backing 的冻结切片，可以返回与长期保存。普通运行时局部数组的 view 不具有这个生命周期。const fn 内切片操作仍不在支持子集中，数组结果可以到常量初始化边界再冻结。

## 检查失败和预算

const test 始终在语义分析时执行，不需要测试产物选项。check 失败使编译失败，但继续当前测试；require/fail 停止当前测试，后续静态测试继续。普通 test 则交给运行时 runner。

常量执行只支持明确的子集，没有原生调用、typed failure、浮点计算、callable 或 Write 参数。所有分支都先检查准入，不能用 `if false` 隐藏不支持操作。整数溢出和预算耗尽是诊断，不回退到运行时。

## 练习

把静态断言改成错误文本，确认 compile 阶段失败。再恢复并运行 `compile --stdout`：编译期输出会写到 stderr，stdout 只包含生成产物。
