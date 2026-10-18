---
title: "测试成功与失败路径"
description: 让正常路径、边界与失败恢复得到可重复验证。
section: learn
lesson: 12
source: docs/language/execution.md
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

测试可以与函数放在同一模块。测试名可以省略：第二条是匿名测试，报告用文件、行和列标识它。用名称描述业务场景；简短的局部不变量可以使用匿名测试。显式名称在模块内必须唯一。直接运行测试：

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

解释器输出同样的汇总。要先检查而不运行普通测试，使用 `carven check totals.cv`；`const test` 仍会在检查时执行。

将生成的测试接入已有 C++ 测试运行器的方法见[命令行参考](/zh/reference/cli/)。

## check、require 与 fail

check 失败报告后继续，适合一组独立断言。require 失败停止当前整个测试，适合后续代码依赖的条件。fail 无条件停止当前测试。消息是 `str` 或 `String`，条件必须 `bool`。

check 与 require 的消息只在条件为 false 时求值。检查成功时，不会构造 `f"quantity {quantity} gives no total"` 这样的说明文本。fail 总会求值消息。停止测试时，也会结束同步调用的 Carven 辅助函数和可调用视图，并清理局部值；try 无法捕获这种停止。

把第一条断言的 36 临时改成 35，再运行 `carven --tests totals.cv`。报告写到 stderr：

```text
totals.cv:4:5: error: check failed
  test:
    module: totals
    name: line total
  condition: total(12, 3) == 35
  operands:
    total(12, 3): 36

carven: tests: 1 passed; 1 failed
```

第一行给出失败断言的位置。`test` 标识模块和测试名，`condition` 显示条件源码，`operands` 显示参与比较的值。继续之前把 35 改回 36。

生成失败说明时不会重新求值操作数；`&&` 或 `||` 短路跳过的一侧标记为 `<not evaluated>`。其余字段与值的显示规则见[测试报告参考](/zh/reference/entry-testing/)。

## 先检查后续操作的前提

读取第一个元素之前，用 `require` 确认集合非空。把这个独立文件保存为 `prerequisite.cv`：

```carven
test "first sample" {
    let samples: Vector<i32> = [];
    require(!samples.is_empty(), "need at least one sample");

    check(samples[0] == 7);
    println("sample checked");
}

test "next case" {
    println("next test");
}
```

运行 `carven --tests prerequisite.cv` 或 `carven interpret --tests prerequisite.cv`。stdout 只输出 `next test`。stderr 报告 `requirement failed`、消息 `need at least one sample`、`note: test stopped`，最后汇总 `carven: tests: 1 passed; 1 failed`，退出状态为 1。索引操作和 `sample checked` 都被跳过，下一条测试仍会执行。

把空集合改为 `[7]`，再次运行。stdout 依次输出 `sample checked`、`next test`，两条测试都通过。这里若把 require 换成 check，失败后会继续访问空集合，触发越界终止，因此这项前提需要停止当前测试。

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

原生进程直接中止，不做普通的栈清理，所以 `not reached` 不会输出，退出状态非零。assert 始终启用，消息只在失败时求值。断言不是类型化失败，try 无法捕获。

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

汇总变为 `carven: tests: 3 passed; 0 failed`。新增测试检查恢复分支和被拒绝的值。测试必须处理每种声明的失败，测试成功输入时也一样。

## 检查元组与集合边界

元组元素支持相等时，测试可直接比较元组结果。把这个独立测试文件保存为 batches.cv：

```carven
fn bounds(values: [i32]) -> (i32, i32) {
    assert(!values.is_empty(), "bounds needs at least one sample");
    var (lower, upper) = (values[0], values[0]);
    for value in values {
        if value < lower { lower = value; }
        if value > upper { upper = value; }
    }
    return (lower, upper);
}

test "mixed signs" {
    check(bounds([7, -2, 4]) == (-2, 7));
}

test "growing runtime batch" {
    var values: Vector<i32> = [7];
    values.push(-2);
    values.push(4);

    check(bounds(values) == (-2, 7));

    let removed = values.remove(1);
    check(removed == -2);
    check(bounds(values) == (4, 7));
}
```

`carven check batches.cv` 检查源码，不运行测试。`carven --tests batches.cv` 原生执行两条测试；`carven interpret --tests batches.cv` 在解释器中运行同样的案例。案例覆盖正负混合、增长、移除顺序与边界重新计算。空输入违反显式不变量并终止执行，不应放在预期类型化恢复的测试里。下一章将介绍静态执行。

## 练习

为 positive 增加一条输入为 3 的匿名成功测试，再把输入改成 -1 并阅读报告。比较 check(false) 与 require(false) 后面一条 `println` 是否执行。把 stock.cv 的第二次调用改成 `remaining(2, 2)`，确认三行都会输出。这里用运行时 test；声明为 `const fn` 的算法还可以通过 `const test` 执行受支持的静态操作。
