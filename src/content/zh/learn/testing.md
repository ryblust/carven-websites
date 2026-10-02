---
title: "测试成功与失败路径"
description: 让正常路径、边界与失败恢复得到可重复验证。
section: learn
lesson: 11
source: docs/semantics.md
---

## 写一条运行时测试

保存 totals.cv：

```carven
fn total(price: i32, count: i32) -> i32 => price * count;

test "line total" {
    check(total(12, 3) == 36);
    check(total(12, 0) == 0, "zero quantity");
}

test {
    check(total(0, 5) == 0);
}
```

测试可以与函数放在同一模块。测试名可以省略：第二条是匿名测试，报告用文件、行和列标识它。显式名称在模块内必须唯一。直接运行测试：

```sh
carven --tests totals.cv
```

命令会生成 C++、编译并运行测试；需要可用的原生 C++ 工具链。结束时在 stderr 输出汇总：

```text
carven: tests: 2 passed; 0 failed
```

通过时退出状态为零，有失败则非零。测试模式不执行 main 或顶层程序语句，因此被测函数和程序入口可以留在同一文件。

这个例子也属于解释器支持范围，可以在不调用 C++ 编译器的情况下执行同一组测试：

```sh
carven interpret --tests totals.cv
```

解释器输出同样的汇总。每条测试使用独立存储和执行预算；执行到原生 C++ 操作的测试需改用原生模式。要先检查而不运行普通测试，使用 `carven check totals.cv`；`const test` 仍会在检查时执行。

需要将测试接入自己的 C++ 构建时，用 `carven compile --tests -o generated totals.cv` 生成默认测试入口，或选择 `--tests=external` 接入已有入口和 reporter。源码收集与入口选择规则见[命令行参考](/zh/reference/cli/)。

## check、require 与 fail

check 失败报告后继续，适合一组独立断言。require 失败停止当前整个测试，适合后续代码依赖的条件。fail 无条件停止当前测试。消息是 `str` 或 `String`，条件必须 `bool`。

check 与 require 的消息只在条件为 false 时求值，因此可以放心构造 `f"quantity {quantity} gives no total"` 这样的详细说明，成功时没有额外开销。fail 总会求值消息。测试停止会穿过同步调用的 Carven 辅助函数和可调用视图，并清理局部值；try 无法捕获测试停止。

把第一条断言的 36 临时改成 35，再运行 `carven --tests totals.cv`。报告写到 stderr：

```text
totals.cv:4:5: error: check failed
  test:
    module: totals
    name: line total
  condition: total(12, 3) == 35
  operands:
    total(12, 3): 36
    35: 35

carven: tests: 1 passed; 1 failed
```

第一行给出失败断言的源码位置。`test` 列出模块和测试名；匿名测试改为显示位置，例如 `name: totals.cv:8:1`。`condition` 是条件源码，`operands` 列出外层比较两侧的表达式和值。失败操作带消息时追加 `message:` 行；require 失败还会追加 `note: test stopped`。`interpret --tests` 使用同样的格式。继续之前把 35 改回 36。

解释不会重新执行比较操作数；`&&` 或 `||` 短路跳过的一侧标记为 `<not evaluated>`。结构体按字段比较，在 operands 中按结构显示。class 没有隐式相等：用 `==` 比较两个 class 值会报告 `CV-TYPE-EQUALITY-UNSUPPORTED`，应改为比较其操作返回的值。

## 用 assert 检查程序不变量

check 与 require 属于测试。无论代码在哪里运行都必须成立的条件，用 assert 表达。保存 stock.cv：

```carven
fn remaining(stock: i32, sold: i32) -> i32 {
    assert(sold <= stock, f"sold {sold} of {stock}");
    return stock - sold;
}

println(remaining(5, 2));
println(remaining(2, 5));
println("not reached");
```

`carven stock.cv` 先在 stdout 输出 `3`，随后在 stderr 报告：

```text
stock.cv:2:5: error: assertion failed
  condition: sold <= stock
  operands:
    sold: 5
    stock: 2
  message: sold 5 of 2
  note: execution aborted
```

原生进程直接中止，不做普通的栈清理，所以 `not reached` 不会输出，退出状态非零。assert 始终启用，不受构建配置和 `NDEBUG` 影响，也不需要测试上下文；消息只在失败时求值。断言不是 typed failure，try 无法捕获。在 `carven interpret` 下，断言失败会停止整个执行；在编译期执行中则产生 `CV-ASSERT`。测试中的断言失败会在报告中附带 `test:` 上下文，整次运行中止，不输出汇总。

求值顺序与完整报告字段见[入口与测试参考](/zh/reference/entry-testing/)。

## 测试可恢复失败

将下面内容追加到前面的 totals.cv，再运行 `carven --tests totals.cv`：

```carven
struct Invalid {
    value: i32,
}

fn positive(value: i32) -> i32 throw Invalid {
    if value <= 0 {
        throw Invalid { value };
    }

    return value;
}

test "reject zero" {
    let rejected = try {
        positive(0)?;
        -1
    } catch {
        Invalid(error) => error.value,
    };

    check(rejected == 0);
}
```

汇总变为 `carven: tests: 3 passed; 0 failed`。test 不允许剩余失败逃出。上例同时确认调用发生了失败、恢复分支得到选择，且载荷带回了被拒绝的值。测试成功输入时也必须处理契约中声明的失败，而不是根据当前输入假设不会失败。

## 读诊断

先看原始 .cv 位置，再读诊断代码与说明。类型、所有权、失败集合、C++ 编译和链接是不同边界；Carven 分析通过后，原生构造或提供者仍可能出错。在终端中 Carven 会为诊断着色，设置 `NO_COLOR` 可关闭。

有意不用的值写 `_`。警告不会让一个其他方面合法的程序失败。遇到原生错误时，检查 include、提供者签名与构造要求。

## 练习

为 positive 增加一条输入为 3 的匿名成功测试，再把输入改成 -1 并阅读报告。比较 check(false) 与 require(false) 后面一条 `println` 是否执行。把 stock.cv 的第二次调用改成 `remaining(2, 2)`，确认三行都会输出。这里用运行时 test；纯编译期算法可以另加 `const test`。
