---
title: "报告失败并选择恢复位置"
description: "说明哪里出错，决定在哪里恢复，并向调用者交代仍可能发生的失败。"
section: learn
lesson: 10
source: docs/language/failures.md
---

## 从一个校验函数开始

零数量是无效输入，但调用者可以提示用户改正后继续。我们把它报告成一种携带被拒绝数值的失败。保存为 quantity.cv：

```carven
struct InvalidQuantity {
    value: i32,
}

fn line_total(price: i32, quantity: i32) -> i32 throw InvalidQuantity {
    if quantity <= 0 {
        throw InvalidQuantity { value: quantity };
    }

    return price * quantity;
}

let total = try {
    line_total(12, 0)?
} catch {
    InvalidQuantity(error) => {
        println("Invalid quantity:", error.value);
        0
    },
};

println("Total:", total);
```

运行 `carven quantity.cv`，输出 `Invalid quantity: 0` 和 `Total: 0`。失败类型是结构体，携带被拒绝的值。签名中的 `throw InvalidQuantity` 告诉调用者可能收到哪种失败；函数体里的 `throw ...;` 则报告一次具体失败。throw 语句不提供预期类型，所以要写出失败类型名，不能使用上下文构造 `{ value: quantity }`。

## 成功值与传播

调用可能失败的函数时，必须决定怎样处理失败。使用 `?`，成功调用给出结果，失败调用则离开当前表达式。失败由外围 try 处理，或在函数声明允许时继续传给调用者。第一次失败会跳过当前求值路径剩余操作；`(first() + second())?` 不会在 first 失败后继续调用 second。

对不会失败的表达式写 ? 是编译错误。私有函数改成推断空集合后，调用者要删除 ?。即使显式声明 E 的函数当前总成功，调用者仍按 E 契约处理。

## 推断和发布

前面的模块章节介绍了私有辅助函数和公开接口。private 非入口函数可以省略 throw 子句，由编译器推断函数体可能向外传播的失败。顶层语句构成隐式入口，也以同样方式推断向外失败。下一章介绍的闭包同样可以推断失败。

把 quantity.cv 中的 try 表达式和最后的 `println` 换成两次直接调用：

```carven
println("Total:", line_total(12, 3)?);
println("Total:", line_total(12, 0)?);
```

这段代码依赖上面的结构体和 line_total。程序先输出 `Total: 36`，第二次调用的 InvalidQuantity 随后离开隐式入口；局部清理结束后，入口包装器在 stderr 报告失败类型和结构化载荷，并以 `EXIT_FAILURE` 退出。顶层语句不需要 throw 子句。

普通裸函数、export 函数和显式 main 若有向外失败，必须显式声明，private main 也不例外。把同样两行放进没有 `throw InvalidQuantity` 的 `fn main() { ... }`，会报告 `CV-EFFECT-THROW-PUBLISHED`。

失败集合可写 `throw A + B`，顺序无关，类型不可重复。失败载荷必须是可复制名义结构体或枚举。

## 部分恢复与重抛

在有显式 throw 契约的函数中，可以只处理一部分失败，其余向外传播。`_ => rethrow` 明确转发剩余原始载荷；`throw NewError { ... }` 翻译为另一种失败。最终集合仍受外层契约约束，通配重抛不能绕过它。

处理分支或守卫条件自身产生的失败会传给外围目标，不会被同一个 try 再次捕获。守卫条件为 false 时继续匹配下一分支。模式只覆盖部分枚举载荷时，仍须处理其余可能值。

## 只恢复自己能处理的失败

```carven
struct MissingPrice {}
struct Offline {}

fn price(has_price: bool) -> i32 throw MissingPrice {
    if !has_price {
        throw MissingPrice {};
    }
    return 15;
}

fn fee(online: bool) -> i32 throw Offline {
    if !online {
        throw Offline {};
    }
    return 2;
}

private fn quote(has_price: bool, online: bool) -> i32 => (price(has_price) + fee(online))?;

fn total(has_price: bool, online: bool) -> i32 throw Offline => try {
    quote(has_price, online)?
} catch {
    MissingPrice(_) => 12,
};

fn main() {
    let price = try {
        total(false, true)?
    } catch {
        Offline(_) => 0,
    };

    println(price);
}
```

输出 `12`。quote 用 `+` 组合两个普通成功值，用一个 `?` 标记整个表达式的失败出口。它的私有契约推断为 MissingPrice + Offline；price 失败后不再调用 fee。quote 和 total 都使用表达式函数体：`=>` 直接返回右侧表达式的值，包括整个 try 表达式。

total 用默认总价恢复 MissingPrice，公开契约只剩 Offline，main 也只需处理后者。组合过程无需另外定义一个聚合错误类型。

把 main 中的实参改成 `(true, true)` 得到 `17`，改成 `(true, false)` 得到 `0`。`(false, false)` 仍得到 `12`：价格缺失让求值在服务调用前停止。契约列出可能失败，不要求每项操作都执行。

在 MissingPrice 分支后增加 `_ => rethrow,`，同样会把 Offline 继续传给调用者。这里省略该 arm 是合法的，因为 total 声明的契约可以接收 Offline。本例使用没有 throw 子句的显式 main，因此 main 必须处理自己的全部失败。

把上面的完整程序保存为 quote.cv，运行 `carven quote.cv`。依次修改 main 中 total 的两个实参，用下面的表检查结果；据此确认选中的恢复路径。

| has_price | online | 输出 | 路径                     |
| --------- | ------ | ---- | ------------------------ |
| true      | true   | 17   | 两步都成功               |
| false     | true   | 12   | 恢复缺失价格，跳过 fee   |
| true      | false  | 0    | Offline 传给 main 恢复   |
| false     | false  | 12   | price 先失败，不调用 fee |

### 调用者漏掉一种失败

把 quote.cv 中的 main 换成直接调用 quote、但只处理 MissingPrice 的版本：

```carven
fn main() {
    let price = try {
        quote(false, true)?
    } catch {
        MissingPrice(_) => 12,
    };

    println(price);
}
```

再运行 `carven quote.cv`，编译在生成 C++ 之前停止。报告的错误中包括：

```text
error [CV-EFFECT-CATCH-NON-EXHAUSTIVE]: catch does not cover every protected failure
 --> quote.cv:27:17
   |
27 |     let price = try {
   |                 ^^^^^
   | ...
31 |     };
   | ^^^^^
note: failure type not fully covered: quote.Offline
```

note 带模块名指出未覆盖的失败类型。同一次运行还会在 main 处报告 `CV-EFFECT-THROW-PUBLISHED`：剩下的 Offline 会逃出没有 throw 子句的显式入口。增加 `Offline(_) => 0,` 分支，或声明 `fn main() throw Offline`，两个错误都会消失。若同样的 try 写在顶层，Offline 会传出隐式入口。继续之前先恢复原来的 main。

## 先解析外部数据，再应用业务策略

把这个独立程序保存为 ports.cv。标准数值解析检查拼写与表示范围，应用再判断自己的零端口策略：

```carven
import std::core using NumberParseError;

struct InvalidPort {
    value: u16,
}

const fn port(text: str) -> u16 throw NumberParseError + InvalidPort {
    let value = u16::parse(text)?;
    if value == 0 {
        throw InvalidPort { value };
    }
    return value;
}

fn display(text: str) => try {
    println("Port:", port(text)?);
} catch {
    NumberParseError(_) => println("Not a complete u16 number"),
    InvalidPort(error) => println("Reserved port:", error.value),
};

display("443");
display("65536");
display("0");
```

输出：

```text
Port: 443
Not a complete u16 number
Reserved port: 0
```

u16::parse 检查完整文本与范围，不截断或回绕。它拒绝前导空白、前导加号与尾随内容。合法 u16 的零通过表示检查，却违反本应用策略。两个失败类型为调用者保留这个区别。

显式失败契约命名 NumberParseError，因此从 std::core 导入该类型。调用本身可在不命名类型的情况下推断并传播失败。port 是 const fn，让同一个受检查解析器与策略也能用于准备；运行时调用仍在运行时。[编译期章节](/zh/learn/constants/)会用解析准备配置，只在适合回退的位置恢复。

## 副作用与入口状态

失败不回滚已经完成的修改。局部值按控制流清理；失败载荷包含借用时，借用的底层存储必须保持存活。C++ 异常、动态越界和除零等终止行为不是这里的类型化失败。

失败逃出隐式入口或显式 main 时，入口包装器先完成普通局部清理，再在 stderr 报告类型与结构化载荷，最后返回 `EXIT_FAILURE`。需要应用自己的消息或恢复时使用 catch。正常 return 的整数不是退出码。

## 练习

把 quantity.cv 中的数量改成 3，应只输出 `Total: 36`。再增加 TooExpensive 失败限制总价，调整 line_total 的签名，并在顶层 try 中处理它。然后去掉这条处理：隐式入口会把 TooExpensive 传出去，stderr 报告载荷，进程以 `EXIT_FAILURE` 退出。把这些语句移进 `fn main() { ... }`，就能看到边界诊断。
