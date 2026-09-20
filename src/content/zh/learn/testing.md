---
title: "测试成功与失败路径"
description: 让正常路径、边界与失败恢复得到可重复验证。
section: learn
lesson: 11
source: docs/semantics.md
---

## 写一条运行时测试

在 Carven 仓库根目录保存 totals.cv：

```carven
fn total(price: i32, count: i32) -> i32 => price * count;

test "line total" {
    check(total(12, 3) == 36);
    check(total(12, 0) == 0, "zero quantity");
}
```

测试可以与函数放在同一模块。先直接运行它：

```sh
carven --tests totals.cv
```

命令会生成 C++、编译并运行测试；需要可用的原生 C++ 工具链。如果从编译器源码仓库运行，使用 `./xmakew run carven --tests totals.cv`。通过时退出状态为零，有失败则非零。测试模式不执行 main 或顶层程序语句，因此被测函数和程序入口可以留在同一文件。

这个例子也属于解释器支持范围，可以在不调用 C++ 编译器的情况下执行同一组测试：

```sh
carven interpret --tests totals.cv
```

解释模式下，每条测试使用独立存储和执行预算。包含原生操作、Write 参数或 callable 的测试改用原生模式。要先检查而不运行普通测试，使用 `carven check totals.cv`；const test 仍会在检查时执行。

需要将测试接入自己的 C++ 构建时，用 `carven compile --tests -o generated totals.cv` 生成默认测试入口，或选择 `--tests=external` 接入已有入口和 reporter。源码收集与入口选择规则见[命令行 Reference](/zh/reference/cli/)。

## check、require 与 fail

check 失败报告后继续，适合一组独立断言。require 失败停止当前整个测试，适合后续代码依赖的条件。fail 无条件停止当前测试。消息是 str 或 String，条件必须 bool。

即使条件成立，消息表达式也会求值，因此不应在其中放入仅应在失败时执行的操作。测试停止会穿过同步调用的 Carven 辅助函数和可调用视图，并清理局部值；try 无法捕获测试停止。

把第一条断言的 36 临时改成 35，再运行测试。直接比较失败时会同时显示两侧表达式和实际值，便于看出 `total(12, 3)` 得到 36。恢复为 36 后继续。解释不会重新执行比较操作数；`&&` 或 `||` 短路跳过的一侧标记为 `<not evaluated>`。

## 测试可恢复失败

将下面内容追加到前面的 totals.cv，再运行 `carven --tests totals.cv`：

```carven
struct Invalid {}

fn positive(value: i32) -> i32 throw Invalid {
    if value <= 0 {
        throw Invalid {};
    }

    return value;
}

test "reject zero" {
    let rejected = try {
        positive(0)?;
        false
    } catch {
        Invalid(_) => true,
    };

    check(rejected);
}
```

test 不允许剩余失败逃出。上例同时确认调用发生了失败和恢复分支得到选择。测试成功输入时也必须处理契约中声明的失败，而不是根据当前输入假设不会失败。

## 读诊断

先看原始 .cv 位置，再看诊断代码和解释。类型、所有权、失败集合、C++ 编译与链接是不同边界。Carven 分析通过后仍可能有原生构造或提供者错误。

未使用名字可以改成 `_` 表达有意丢弃。警告不使有效程序失败。遇到原生错误，应检查头文件、提供者签名与构造要求。

## 练习

为 positive 增加成功值 3 的测试，再把输入改成 -1。比较 check(false) 与 require(false) 后面一条 println 是否执行。这里用运行时 test；纯编译期算法可以另加 const test。
