---
title: 可恢复失败与契约
description: 定义带数据的失败，在调用处传播，在有业务上下文的位置恢复。
section: learn
lesson: 9
source: docs/semantics.md
---

## 从一个校验函数开始

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

fn main() {
    let result = try {
        line_total(12, 0)?
    } catch {
        InvalidQuantity(error) => {
            println("Invalid quantity:", error.value);
            0
        },
    };

    println("Total:", result);
}
```

输出 `Invalid quantity: 0` 和 `Total: 0`。失败类型是结构体，携带被拒绝的值。`throw InvalidQuantity` 是函数签名中的上界，体内 `throw ...;` 才实际产生失败。

## 成功值与传播

调用可失败函数产生待处理失败。`?` 成功时给出成功值，失败时转移到最近外围 try 或 callable 失败目标。第一次失败会跳过当前求值路径剩余操作；`(first() + second())?` 不会在 first 失败后继续调用 second。

对不会失败的表达式写 ? 是编译错误。私有函数改成推断空集合后，调用者要删除 ?。即使显式声明 E 的函数当前总成功，调用者仍按 E 契约处理。

## 推断和发布

private 非入口函数与 lambda 可以省略 throw 子句并推断最小失败集合，包含递归依赖。普通裸函数、export 和 main 若有向外失败，必须显式声明，private main 也不例外。

失败集合可写 `throw A + B`，顺序无关，类型不可重复。失败载荷必须是可复制名义结构体或枚举。

## 部分恢复与重抛

在有显式 throw 契约的函数中，可以只处理一部分失败，其余向外传播。`_ => rethrow` 明确转发剩余原始载荷；`throw NewError { ... }` 翻译为另一种失败。最终集合仍受外层契约约束，通配重抛不能绕过它。

handler 或 guard 自己失败会进入外围目标，不重新进入同一个 try。guard 为 false 会继续下一 arm。模式只覆盖部分枚举载荷时，仍要考虑其余值。

## 只恢复自己能处理的失败

```carven
struct MissingPrice {}
struct ServiceUnavailable {}

fn lookup_price(available: bool) -> i32 throw MissingPrice + ServiceUnavailable {
    if !available {
        throw ServiceUnavailable {};
    }

    throw MissingPrice {};
}

fn price_or_default(available: bool) -> i32 throw ServiceUnavailable {
    return try {
        lookup_price(available)?
    } catch {
        MissingPrice(_) => 12,
    };
}

fn main() {
    let price = try {
        price_or_default(true)?
    } catch {
        ServiceUnavailable(_) => 0,
    };

    println(price);
}
```

输出 `12`。price_or_default 用默认价格恢复 MissingPrice，剩余 ServiceUnavailable 自动传给它的外围函数目标。调用者只需处理后者。把 main 中的实参改为 false，输出 `0`。

在 MissingPrice arm 后增加 `_ => rethrow,` 也会保留同一剩余集合。这里省略该 arm 是合法的，因为 price_or_default 声明的契约可以接收 ServiceUnavailable。没有向外契约的 main 必须处理自己的全部失败。

## 副作用与入口状态

失败不回滚已经完成的修改。局部值按控制流清理；含借用的失败载荷必须保住 backing。C++ 异常、动态越界和除零等终止行为不是这里的 typed failure。

main 声明失败并让它逃出时产生失败进程状态，不自动打印载荷；需要用户可读消息时自行 catch 并打印。正常 return 的整数不是退出码。

## 练习

把数量改成 3，应只输出 Total: 36。再增加 TooExpensive 失败，限制总价，调整签名和 main 的处理。尝试漏掉该处理，观察边界诊断。
