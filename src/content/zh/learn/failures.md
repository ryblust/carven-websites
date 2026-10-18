---
title: "报告失败并选择恢复位置"
description: "说明哪里出错，决定在哪里恢复，并向调用者交代仍可能发生的失败。"
section: learn
lesson: 10
source: docs/language/failures.md
---

## 从一个校验函数开始

零数量是无效输入，但调用者可以提示用户改正后继续。我们把它报告成一种携带被拒绝数值的失败。保存为 quantity.cv：

```carven run
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

前面的模块章节介绍了私有辅助函数和公开接口。private 非入口函数可以省略 throw 子句，由编译器推断函数体可能向外传播的失败。顶层语句构成隐式入口，也以同样方式推断向外传播的失败。下一章介绍的闭包同样可以推断失败。

保留 quantity.cv 中的 InvalidQuantity 声明和 line_total 函数。从 `let total = try` 开始，把全部顶层语句替换为这两次直接调用：

```carven
println("Total:", line_total(12, 3)?);
println("Total:", line_total(12, 0)?);
```

这段代码依赖上面的结构体和 line_total。程序先输出 `Total: 36`，第二次调用的 InvalidQuantity 随后离开隐式入口；局部清理结束后，入口包装器在 stderr 报告失败类型和携带的数据，并以 `EXIT_FAILURE` 退出。顶层语句不需要 throw 子句。

未标记为 private 的普通函数、export 函数和显式 main 若有向外传播的失败，必须显式声明，private main 也不例外。把同样两行放进没有 `throw InvalidQuantity` 的 `fn main() { ... }`，会报告 `CV-EFFECT-THROW-PUBLISHED`。

失败集合可写 `throw A + B`，顺序无关，类型不可重复。失败数据必须使用可复制的结构体或枚举（名义类型）。

## 只恢复自己能处理的失败

把这个独立程序保存为 quote.cv：

```carven run
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
    _ => rethrow,
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

total 用默认总价恢复 MissingPrice，公开契约只剩 Offline，main 也只需处理后者。

`_ => rethrow` 把剩余的 Offline 失败原样传给调用者。main 没有 throw 子句，因此在本地处理这个失败。自动转发与 guard 条件的完整规则见[部分 catch 参考](/zh/reference/failures/)。

运行 `carven quote.cv`。依次修改 main 中 total 的两个实参，用下表检查结果和选中的恢复路径：

| has_price | online | 输出 | 路径                     |
| --------- | ------ | ---- | ------------------------ |
| true      | true   | 17   | 两步都成功               |
| false     | true   | 12   | 恢复缺失价格，跳过 fee   |
| true      | false  | 0    | Offline 传给 main 恢复   |
| false     | false  | 12   | price 先失败，不调用 fee |

### 调用者漏掉一种失败

在 main 中，把 `total(false, true)?` 改成 `quote(false, true)?`，并把 Offline 处理分支换成 `MissingPrice(_) => 12,`。运行 `carven check quote.cv`。编译器报告 `CV-EFFECT-CATCH-NON-EXHAUSTIVE`，因为 catch 遗漏了 Offline；同时报告 `CV-EFFECT-THROW-PUBLISHED`，因为 main 没有允许该失败向外传播的契约。

增加 `Offline(_) => 0,` 分支来处理它，或声明 `fn main() throw Offline` 来传播它。继续之前恢复原来的 main。

## 先解析外部数据，再应用业务策略

把这个独立程序保存为 ports.cv。标准数值解析检查拼写与表示范围，应用再判断自己的零端口策略：

```carven run
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

u16::parse 检查完整文本与范围，不截断或回绕。它拒绝前导空白、前导加号与尾随内容。零在 u16 的取值范围内，却违反本应用策略。两个失败类型为调用者保留这个区别。

失败契约中显式写出了 NumberParseError，因此从 `std::core` 导入该类型。[编译期章节](/zh/learn/constants/)会复用这套解析和校验来准备配置。

## 副作用与入口状态

失败不回滚已经完成的修改。局部值按控制流清理；失败载荷包含借用时，借用的底层存储必须保持存活。C++ 异常、动态越界和除零等终止行为不是这里的类型化失败。

需要应用自己的消息或恢复时，使用 catch。入口失败报告与进程退出状态见[入口参考](/zh/reference/entry-testing/)。

## 练习

先恢复首个带有顶层 try 的 quantity.cv 程序。把调用改为 `line_total(12, 3)`，应只输出 `Total: 36`。再增加 TooExpensive 失败限制总价，调整 line_total 的签名，并在顶层 try 中处理它。然后去掉这条处理：隐式入口会把 TooExpensive 传出去，stderr 报告载荷，进程以 `EXIT_FAILURE` 退出。把这些语句移进 `fn main() { ... }`，就能看到边界诊断。
