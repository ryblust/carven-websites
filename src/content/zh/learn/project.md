---
title: "练习：库存批处理"
description: "用小型库存批次练习类、编译期构造的集合和失败恢复。"
section: learn
lesson: 17
source: docs/language/tutorial.md
---

## 运行库存批处理

组合前面学过的[类与访问](/zh/learn/ownership/#用类控制字段访问)、[保存集合的常量](/zh/learn/constants/)和[失败恢复](/zh/learn/failures/)，处理四笔购买请求：成功时扣减库存并保留收据，库存不足时记为缺货预订，其他请求被拒绝时报告原因，再继续处理。

金额使用货币最小单位，每笔购买上限为 100000。单价和初始库存必须非负，固定请求中的索引均指向现有商品。把这个完整程序保存为 orders.cv：

```carven run
struct Receipt {
    item: String,
    quantity: i32,
    amount: i64,
}

struct InvalidQuantity {
    requested: i32,
}

struct OutOfStock {
    requested: i32,
    available: i32,
}

struct OrderLimit {
    amount: i64,
    limit: i64,
}

enum OrderResult {
    Paid(Receipt),
    Backorder(OutOfStock),
}

const order_limit: i64 = 100000;

class Stock {
    name: String,
    price: i32,
    units: i32,

    const fn new(name: str, price: i32, units: i32) -> Stock {
        assert(price >= 0 && units >= 0, "catalog values must be nonnegative");
        return { name: name as String, price: price, units: units };
    }

    const fn remaining(self) -> i32 => self.units;

    const fn purchase(&self, quantity: i32) -> Receipt throw InvalidQuantity + OrderLimit + OutOfStock {
        if quantity <= 0 {
            throw InvalidQuantity { requested: quantity };
        }

        let amount = (self.price as i64) * (quantity as i64);
        if amount > order_limit {
            throw OrderLimit { amount: amount, limit: order_limit };
        }

        if quantity > self.units {
            throw OutOfStock { requested: quantity, available: self.units };
        }

        self.units -= quantity;
        return { item: self.name, quantity: quantity, amount: amount };
    }
}

private const fn reserve(&stock: Stock, quantity: i32) -> OrderResult => try {
    .Paid(stock.purchase(quantity)?)
} catch {
    OutOfStock(error) => .Backorder(error),
};

const catalog: Vector<Stock> = [
    Stock::new("Lamp", 1200, 3),
    Stock::new("Desk", 25000, 4),
];

var inventory = catalog;
let requests = [(0usize, 2), (0usize, 2), (1usize, 4), (0usize, 0)];
var paid: Vector<Receipt> = [];

for (index, quantity) in requests {
    try {
        match reserve(&inventory[index], quantity)? {
            .Paid(receipt) => paid.push(receipt),
            .Backorder(error) => println("Backorder:", error.requested, error.available),
        }
    } catch {
        InvalidQuantity(error) => println("Invalid quantity:", error.requested),
        OrderLimit(error) => println("Order limit:", error.amount, error.limit),
    }
}

var total: i64 = 0;
for receipt in paid {
    println(f"{receipt.item}: {receipt.quantity} units, {receipt.amount}");
    total += receipt.amount;
}

println("Paid:", paid.length(), "Total:", total);
println("Stock:", inventory[0].remaining(), inventory[1].remaining());
```

运行 `carven orders.cv` 或 `carven interpret orders.cv`，两者都输出：

```text
Backorder: 2 1
Invalid quantity: 0
Lamp: 2 units, 2400
Desk: 4 units, 100000
Paid: 2 Total: 102400
Stock: 1 0
```

对照源码确认以下关系：

- `Stock::purchase` 先检查数量、金额和可用库存，再修改数量。类型化失败保留原库存。乘法前先把两个 i32 操作数转换为 i64。
- catalog 在编译期构造，inventory 保存可修改的独立副本。每张 Receipt 保存自己的商品名副本，因此不依赖这份库存继续存活。
- 私有辅助函数 reserve 把 OutOfStock 恢复为 Backorder，并推断剩余失败。循环处理这些失败；后续请求失败时，之前成功的购买仍然有效。

## 验证并扩展规则

追加这个静态测试，运行 `carven check orders.cv`。它检查金额上限是否包含边界、库存修改，以及目录副本是否独立：

```carven
const test "order limit is inclusive" {
    var inventory = catalog;

    let receipt = try {
        inventory[1].purchase(4)?
    } catch {
        _ => fail("purchase at the limit must succeed"),
    };

    check(receipt.amount == order_limit);
    check(inventory[1].remaining() == 0);
    check(catalog[1].remaining() == 4);
}
```

参照[测试课程](/zh/learn/testing/)，为以下情况补充普通测试：

1. 零数量和超出金额上限分别报告预期失败载荷，并保留原库存。
2. 成功购买后再次请求超出剩余库存的数量，得到携带请求量和可用量的 Backorder，剩余库存不变。

用 `carven --tests orders.cv` 或 `carven interpret --tests orders.cv` 运行补充的测试。

进一步练习：增加补货方法，要求数量为正，并在修改前检查新数量是否在 i32 的取值范围内。测试成功更新和拒绝后库存不变的情况。[JSON 输入项目](/zh/learn/data-pipeline/)介绍如何用有大小限制的输入替换固定请求。
