---
title: 入口、运行时测试与编译期测试
description: 入口选择、进程状态、assert、check/require/fail、测试报告和测试停止传播。
section: reference
lesson: 14
source: docs/language/execution.md
---

## 入口

一个编译批次最多一个程序入口，可以是名为 main 的函数，也可以是一个包含顶层可执行语句的文件。多个入口在各源位置诊断。生成 C++ 可以没有入口，执行程序必须有入口。

顶层语句按顺序组成隐式入口。声明可穿插其中；顶层 `const` 绑定仍是模块常量，常量块在分析时执行且不形成入口，`let`/`var` 是入口局部变量，模块函数不能捕获它们。隐式入口没有源码 callable 名字、参数或声明失败集合；它像没有 throw 子句的私有函数一样，从函数体推断向外失败。它使用普通函数体的推断、访问、清理和失败处理规则，因此顶层语句可以用 `?` 传播失败：

```carven
struct Missing {}

fn load(ready: bool) -> i32 throw Missing {
    if !ready {
        throw Missing {};
    }
    return 42;
}

println(load(true)?);
println(load(false)?);
println("not reached");
```

原生执行打印 `42`，然后在 stderr 报告逃逸失败的类型和结构化载荷，以 `EXIT_FAILURE` 退出。`carven interpret` 打印 `42`，然后在 throw 位置以 `CV-INTERPRET-EXECUTION` 报告同一载荷并附调用路径。

显式 main 的模块路径、craft 与可见性不影响选择。它可无参，或有一个无类型注解的 Read 命令行参数。该参数是入口专用不透明值，不是可索引/迭代序列。普通函数参数仍要求类型。

有向外失败的显式 main 必须写 throw 子句，包括 private main；省略时报告 `CV-EFFECT-THROW-PUBLISHED`。正常完成返回进程状态零，Carven 返回值不作为状态。带类型的失败逃出任一种入口时产生 C++ `EXIT_FAILURE`，并在 stderr 输出一条包含类型和结构化载荷的报告。普通局部清理先完成，包装器将载荷保留到报告完成并在退出前销毁。失败值不携带源位置，所以原生报告指向入口声明。捕获后正常完成则返回零且没有失败报告。

## 测试声明

`test "name" { ... }` 与 `test { ... }` 声明模块局部、无参数、无结果的测试体。名字可省略；显式名字在模块内唯一，不能是 main。报告以文件、行和列标识匿名测试。无论是否请求测试产物，测试都参与解析和语义检查；不得向外暴露失败。

```carven
fn add(a: i32, b: i32) -> i32 => a + b;

test "addition" {
    check(add(20, 22) == 42);
}
```

`carven --tests` 原生运行普通测试，`carven interpret --tests` 执行通过准入的普通测试；两者要求至少一条运行时测试，且跳过程序入口。check 和普通 compile 只分析运行时测试。`compile --tests` / `--tests=default` 生成模块测试、runner 和默认测试入口，抑制程序入口包装。`--tests=external` 保留程序入口包装并生成测试与 runner，由消费者选择入口。生成允许空测试集。

## 测试操作

```text
assert(condition);
assert(condition, message);
check(condition);
check(condition, message);
require(condition);
require(condition, message);
fail();
fail(message);
```

condition 必须是 `bool`；可选 message 是 `str` 或 `String`。check/require/fail 的实参个数、条件类型、消息类型错误分别用 `CV-TEST-ARGUMENT-COUNT`、`CV-TEST-CONDITION-TYPE`、`CV-TEST-MESSAGE-TYPE` 诊断；assert 对应使用 `CV-TYPE-CALL-ARITY`、`CV-TYPE-CONDITION-BOOL` 和 `CV-TYPE-MISMATCH`。

直接调用 assert、check 和 require 时，条件恰好求值一次。只有条件为假才求值可选消息，且只求值一次、在条件之后。fail 总会求值消息。被跳过的消息仍接受类型检查。把 builtin 绑定为 callable 值后，间接调用处仍按普通规则先求值全部实参。

失败的 check 报告后继续；失败的 require 和 fail 报告并停止整个当前测试，包括嵌套 Carven helper 和 view。停止不同于 return、break 和 typed failure，try 捕获不到。普通清理完成后 runner 执行下一测试。该传播不能穿过任意原生 C++ 回调。

runner 为同步 Carven 调用链提供 check/require/fail 所需的测试上下文，源码没有上下文实参。在没有活动测试的运行时调用它们违反运行时契约。builtin 遵守普通查找和遮蔽；本地名字、模块声明和显式 import 可遮蔽，原生 namespace wildcard 不遮蔽已知 builtin。作为值使用时需要具体 `fn(...) -> void` 上下文。

## assert

assert 不需要测试上下文，并且总是启用，与原生构建配置和 `NDEBUG` 无关。它不是 typed failure，try 无法恢复。

| 失败位置           | 结果                                       |
| ------------------ | ------------------------------------------ |
| 原生程序或测试     | 向 stderr 报告并中止进程，不执行普通栈清理 |
| `carven interpret` | 报告并停止整个执行，包括剩余测试；状态 1   |
| 编译期执行         | 产生 `CV-ASSERT` 并停止当前求值            |

```carven
fn checked_index(index: usize, len: usize) -> usize {
    assert(index < len, "index out of range");
    return index;
}

println(checked_index(1, 3));
println(checked_index(3, 3));
println("not reached");
```

`carven main.cv` 打印 `1`，随后在 stderr 报告并中止（POSIX 上因 `SIGABRT` 返回 134）：

```text
main.cv:2:5: error: assertion failed
  condition: index < len
  operands:
    index: 3
    len: 3
  message: index out of range
  note: execution aborted
```

解释执行的报告会在 note 之前多出 `called from: main.cv:7:9`。中止的运行不输出完成汇总。原生测试中 assert 失败时，报告包含模块以及显式测试名或源位置。

## 报告位置

每条失败报告以 `file:line:column: error: description` 开头，使用原始 .cv 显示位置以及操作名的一基行号和列号。随后是缩进字段：`test`（模块，以及显式名字或源位置）、`condition`、`operands`，有消息时还有 `message`。多行字段使用缩进块；显式空消息显示为 `message: ""`。builtin 作为 callable 值使用时定位到其绑定表达式。直接 assert/check/require 报告完整条件源码的 UTF-8 字节，含括号、空白、换行和注释；fail 没有条件。

```carven
fn add(a: i32, b: i32) -> i32 => a + b;

test "addition" {
    check(add(20, 22) == 42);
}

test {
    let total = add(2, 2);
    check(total == 5, "total mismatch");
    require(total > 0);
}
```

`carven --tests main.cv` 与 `carven interpret --tests main.cv` 在 stderr 输出相同报告并返回 1：

```text
main.cv:9:5: error: check failed
  test:
    module: main
    name: main.cv:7:1
  condition: total == 5
  operands:
    total: 4
  message: total mismatch

carven: tests: 1 passed; 1 failed
```

报告在操作失败时立即输出。成功用例没有单独报告；同一测试中多次 check 失败只计为一个失败用例。运行结束时在 stderr 输出 `carven: tests: N passed; M failed`；程序打印保持原来的流。最后的 note 标明被停止的测试或中止的执行。原生自定义 reporter 自行控制输出，不会收到默认汇总。编译期诊断保留错误代码与源码摘录，并使用相同的 condition、operands 和 message 布局。

## 断言解释

直接 assert/check/require 的最外层条件若是 Carven 比较，失败时报告操作数源码和结构化值。最外层 `&&` / `||` 报告两个布尔子表达式，并把未执行项标为 `<not evaluated>`。值的显示与源码相同的操作数（例如字面量）会省略；没有剩余项时不显示 operands 字段。括号保留这一行为，间接调用和其他条件保留条件与消息报告。解释不递归追踪内部运算，也不寻找第一个不同字段。

解释复用原求值，不重复执行操作数、不调用 formatter，并保留求值顺序、快照、短路、传播与清理。失败值在可选消息表达式执行前显示，因此消息中的修改不会改变解释；成功的条件不渲染值。运行时 reporter 接收只在同步回调期间有效的借用 explanation 字符串；静态测试诊断包含相同解释。

## 运行时 trap

整数除零或对零取余、非法移位数、越界索引和受检查标量转换的非法值，会报告操作源位置、当前测试上下文与 `note: execution aborted`。索引 trap 另显示 index 和 length。生成与解释检查使用 Carven 位置；直接原生支持调用使用 API 提供的 C++ 位置。trap 中止整个解释运行，包括剩余测试，不输出完成汇总。trap 与断言不同于可恢复的测试停止和带类型失败。

## `const test`

```carven
const fn square(value: i32) -> i32 => value * value;

const test "square at compile time" {
    check(square(6) == 36);
    println("checked");
}
```

`const test` 与匿名的 `const test { ... }` 在语义分析完成 body 构建后执行一次，与测试产物开关无关。body 使用常量执行子集，可直接调用 `const fn`、通过具名 `const fn` 的局部绑定调用、打印和使用测试操作；不支持的操作在执行到时诊断。每个测试拥有独立存储和预算，按输入批次模块顺序及模块内源码顺序执行。通过的 `const test` 不生成运行时测试函数或 runner 项。

失败 check 是编译错误但继续当前测试；失败 require/fail、执行错误或预算耗尽停止当前测试，后续 `const test` 仍执行。失败消息文本计入累计文本工作预算。普通必需常量初始化器没有活动测试，执行测试操作会被拒绝。

常量测试验证编译期执行。运行时测试可通过生成的原生代码或解释器子集执行；C++ 集成须用原生模式覆盖，解释执行不验证生成 C++ 或原生链接。
