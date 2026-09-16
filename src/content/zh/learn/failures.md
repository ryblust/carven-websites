---
title: "组合失败与缩小契约"
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

前面的模块章节介绍了私有辅助函数和公开接口。private 非入口函数可以省略 throw 子句，由编译器推断函数体可能向外传播的失败。普通裸函数、export 和 main 若有向外失败，必须显式声明，private main 也不例外。下一章介绍的闭包同样可以推断失败。

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

private fn quote(has_price: bool, online: bool) -> i32 {
    return (price(has_price) + fee(online))?;
}

fn total(has_price: bool, online: bool) -> i32 throw Offline {
    return try {
        quote(has_price, online)?
    } catch {
        MissingPrice(_) => 12,
    };
}

fn main() {
    let price = try {
        total(false, true)?
    } catch {
        Offline(_) => 0,
    };

    println(price);
}
```

输出 `12`。quote 用 `+` 组合两个普通成功值，用一个 `?` 标记整个表达式的失败出口。它的私有契约推断为 MissingPrice + Offline；price 失败后不再调用 fee。

total 用默认总价恢复 MissingPrice，公开契约只剩 Offline，main 也只需处理后者。组合过程无需另外定义一个聚合错误类型。

把 main 中的实参改成 `(true, true)` 得到 `17`，改成 `(true, false)` 得到 `0`。`(false, false)` 仍得到 `12`：价格缺失让求值在服务调用前停止。契约列出可能失败，不要求每项操作都执行。

在 MissingPrice arm 后增加 `_ => rethrow,` 也会保留同一剩余集合。这里省略该 arm 是合法的，因为 total 声明的契约可以接收 Offline。没有向外契约的 main 必须处理自己的全部失败。

## 用 C++23 保留相同的失败信息

下面的完整程序保留前例的返回值、失败类型和先后顺序。price 与 fee 各有一种失败；quote 将它们组合；total 只恢复 MissingPrice：

```cpp
#include <expected>
#include <iostream>
#include <variant>

struct MissingPrice {};
struct Offline {};

std::expected<int, MissingPrice> price(bool has_price) {
    if (!has_price) {
        return std::unexpected(MissingPrice{});
    }
    return 15;
}

std::expected<int, Offline> fee(bool online) {
    if (!online) {
        return std::unexpected(Offline{});
    }
    return 2;
}

using Error = std::variant<MissingPrice, Offline>;

std::expected<int, Error> quote(bool has_price, bool online) {
    auto item = price(has_price);
    if (!item) {
        return std::unexpected(item.error());
    }
    auto extra = fee(online);
    if (!extra) {
        return std::unexpected(extra.error());
    }
    return *item + *extra;
}

std::expected<int, Offline> total(bool has_price, bool online) {
    auto result = quote(has_price, online);
    if (result) {
        return *result;
    }
    if (std::holds_alternative<MissingPrice>(result.error())) {
        return 12;
    }
    return std::unexpected(std::get<Offline>(result.error()));
}

int main() {
    auto result = total(false, true);
    std::cout << result.value_or(0) << '\n';
}
```

保存为 quote.cpp，用支持 C++23 expected 的工具链执行 `c++ -std=c++23 quote.cpp -o quote`，再运行 `./quote`，得到 `12`。把 total 的实参换成前面的四组输入，两边结果一致。

按调用顺序比较：C++ 的 quote 先检查 price，再调用 fee，并把两种错误分别放入 Error；Carven 的组合表达式与 `?` 表达同样的短路路径。到 total，C++ 取出剩余的 Offline 放入新的 expected；Carven 根据 catch 的覆盖范围检查剩余失败集合。

C++ 的组合器或结果库也能封装这些分支。这里保留显式写法，方便观察类型与控制流如何对应。Carven 把这套组合规则放进语言中，私有函数不必另行声明汇总类型。

保持 total 的接口只允许 Offline：把 Carven 中 total 的函数体改成 `return quote(has_price, online)?;`，并删除 C++ 中处理 MissingPrice 的 if 分支。Carven 会报告剩余失败超出契约。上面的 C++ 写法仍能编译，但缺少价格时，剩下的 `std::get<Offline>` 会抛出 std::bad_variant_access：返回类型并不能证明当前 variant 一定保存 Offline。Carven 的检查同时利用了失败类型与处理分支的覆盖范围。

## 副作用与入口状态

失败不回滚已经完成的修改。局部值按控制流清理；失败载荷包含借用时，借用的底层存储必须保持存活。C++ 异常、动态越界和除零等终止行为不是这里的类型化失败。

main 声明失败并让它逃出时产生失败进程状态，不自动打印载荷；需要用户可读消息时自行 catch 并打印。正常 return 的整数不是退出码。

## 练习

把数量改成 3，应只输出 Total: 36。再增加 TooExpensive 失败，限制总价，调整签名和 main 的处理。尝试漏掉该处理，观察边界诊断。
