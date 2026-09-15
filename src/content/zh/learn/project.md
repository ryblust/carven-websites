---
title: 完整练习：订单报价与恢复
description: 组合结构体、失败类型、Write 更新和文本输出，完成一个可运行程序。
section: learn
lesson: 15
source: docs/semantics.md
---

## 任务与规则

实现一个小型订单报价：数量必须为正，库存必须足够；校验失败不扣库存，成功后才扣减。金额使用整数最小单位，避免把浮点表示引入这个练习。

保存为 orders.cv：

```carven
struct Item {
    price: i32,
    available: i32,
}

struct InvalidQuantity {
    requested: i32,
}

struct OutOfStock {
    requested: i32,
    available: i32,
}

fn quote(
    item: Item,
    quantity: i32,
) -> i32 throw InvalidQuantity + OutOfStock {
    if quantity <= 0 {
        throw InvalidQuantity { requested: quantity };
    }

    if quantity > item.available {
        throw OutOfStock {
            requested: quantity,
            available: item.available,
        };
    }

    return item.price * quantity;
}

fn purchase(
    &item: Item,
    quantity: i32,
) -> i32 throw InvalidQuantity + OutOfStock {
    let amount = quote(item, quantity)?;

    item.available -= quantity;
    return amount;
}

fn main() {
    var item = Item { price: 1200, available: 3 };

    let first = try {
        purchase(&item, 2)?
    } catch {
        InvalidQuantity(_) => 0,
        OutOfStock(_) => 0,
    };

    println(f"Paid: {first}; remaining: {item.available}");

    try {
        purchase(&item, 2)?;
    } catch {
        InvalidQuantity(error) => {
            println("Invalid quantity:", error.requested);
        },
        OutOfStock(error) => {
            println("Requested:", error.requested, "available:", error.available);
        },
    }

    println("Remaining:", item.available);
}
```

运行 `carven orders.cv`，预期：

```text
Paid: 2400; remaining: 1
Requested: 2 available: 1
Remaining: 1
```

## 为什么失败后库存仍为 1

quote 先检查再返回价格。purchase 只有在 `?` 得到成功值之后才修改库存。第二次调用在 quote 内失败，跳过扣减。这里由代码顺序保证业务行为，语言没有自动事务回滚。

## 参数访问与载荷

quote 使用 Read，只读取 Item。purchase 用 Write 改原对象，调用处写 &item。失败保存请求数量和实际库存，使 handler 可以输出上下文。返回的成功金额与失败类型分别受签名约束。

## 扩展测试

测试文件保留 Item、两个失败类型、quote 和 purchase 定义，再加入下面的 test。使用默认测试入口时，不把前面的 main 放入该测试文件；以 orders_tests.cv 保存后生成、编译并运行测试：

```carven
test "failed purchase preserves stock" {
    var item = Item { price: 1200, available: 1 };
    let rejected = try {
        purchase(&item, 2)?;
        false
    } catch {
        InvalidQuantity(_) => false,
        OutOfStock(_) => true,
    };

    check(rejected);
    check(item.available == 1);
}
```

```sh
carven compile --tests=default -o generated orders_tests.cv
clang++ -std=c++20 -Igenerated -Icrafts \
  generated/orders_tests.cpp \
  generated/carven/generated/carven-test-main.cpp \
  -o generated/orders-tests
./generated/orders-tests
```

这里的 crafts 指匹配编译器版本的运行时头文件目录；命令在 Carven 仓库根目录可直接使用该相对路径。测试文件不导入带 main 的原文件，避免把两个入口链接在一起。

## 独立完成的扩展

增加 DeliveryError 与配送费用函数，组合到 quote 的成功价格。先决定配送失败应当发生在扣库存之前还是之后，再安排调用顺序。增加一条测试证明你的选择。若发生在扣减之后，需要业务自行补偿；不要仅靠扩大 throw 契约假设库存会恢复。

当前金额乘法仍使用 i32 运行时回绕规则。面向实际订单系统时，还需验证金额上界，并按业务设计独立的金额溢出失败。
