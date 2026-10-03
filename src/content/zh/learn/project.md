---
title: "实践：成功后才扣减库存"
description: 组合校验、Write 更新、选择性恢复的类型化失败、断言和测试，完成一个可运行程序。
section: learn
lesson: 15
source: docs/language/tutorial.md
---

## 任务与规则

实现一个小型订单系统：数量必须为正，库存必须足够；校验失败不扣库存，成功后才扣减。库存不足时记为缺货预订，不收费；数量无效则仍作为错误交给调用者。金额使用整数最小单位，避免把浮点表示引入这个练习。

保存为 orders.cv：

```carven
struct Item {
    name: str,
    price: i32,
    stock: i32,
}

struct Receipt {
    quantity: i32,
    amount: i32,
}

struct InvalidQuantity {
    requested: i32,
}

struct OutOfStock {
    requested: i32,
    available: i32,
}

fn quote(item: Item, quantity: i32) -> i32 throw InvalidQuantity + OutOfStock {
    if quantity <= 0 {
        throw InvalidQuantity { requested: quantity };
    }

    if quantity > item.stock {
        throw OutOfStock { requested: quantity, available: item.stock };
    }

    return item.price * quantity;
}

fn purchase(&item: Item, quantity: i32) -> Receipt throw InvalidQuantity + OutOfStock {
    let amount = quote(item, quantity)?;

    item.stock -= quantity;
    assert(item.stock >= 0, f"{item.name} stock fell to {item.stock}");

    return { quantity: quantity, amount: amount };
}

fn reserve(&item: Item, quantity: i32) -> Receipt throw InvalidQuantity => try {
    purchase(&item, quantity)?
} catch {
    OutOfStock(error) => {
        println("Backorder:", error.requested, "requested,", error.available, "available");
        ({})
    },
};

var lamp: Item = { name: "Lamp", price: 1200, stock: 3 };

println(reserve(&lamp, 2)?);
println(reserve(&lamp, 2)?);
println("Remaining:", lamp.stock);

try {
    reserve(&lamp, 0)?;
} catch {
    InvalidQuantity(error) => println("Invalid quantity:", error.requested),
}
```

运行 `carven orders.cv`，预期：

```text
Receipt {
    quantity: 2,
    amount: 2400,
}
Backorder: 2 requested, 1 available
Receipt {
    quantity: 0,
    amount: 0,
}
Remaining: 1
Invalid quantity: 0
```

`carven interpret orders.cv` 不调用 C++ 编译器，输出相同。

## 为什么失败后库存仍为 1

quote 先检查再返回价格。purchase 只有在 `?` 得到成功值之后才修改库存。第二次购买在 quote 内失败，跳过扣减。这里由代码顺序保证业务行为，语言没有自动事务回滚。

扣减之后，assert 表达一条不变量：库存永远不为负。它不是可恢复的失败。若以后的修改打乱了检查顺序，程序会停在断言处，报告条件、操作数的值和消息，而不是带着错误库存继续运行。参见[用 assert 检查程序不变量](/zh/learn/testing/#用-assert-检查程序不变量)。

## 参数访问与载荷

quote 使用 Read，只读取 Item。purchase 和 reserve 用 Write 修改原对象，调用处写 `&item`。失败保存请求数量和实际库存，让处理分支能够输出失败时的具体情况。成功值与失败类型分别受签名约束。

收据和商品都使用上下文构造。`return { quantity: quantity, amount: amount };` 的类型来自 purchase 的 `Receipt` 结果，而不是失败集合；`var lamp: Item = { ... }` 的类型来自标注。reserve 的 catch 分支用 `({})` 构造空 Receipt；分支体开头的裸 `{}` 会被当作空块。

## 选择性恢复

reserve 只处理 OutOfStock，把它变成空收据；契约 `throw InvalidQuantity` 把剩下的失败继续传出。顶层语句构成隐式入口，会推断向外失败：`reserve(&lamp, 2)?` 可以不写 throw 子句就把 InvalidQuantity 传出去。最后的 try 显式恢复它并打印载荷。

删去 reserve 中的 `OutOfStock(error)` 分支，运行 `carven check orders.cv`：`CV-EFFECT-SIGNATURE-BOUND` 报告函数体超出声明的契约，因为 OutOfStock 现在会逃出。函数只有处理掉某种失败，才能把它从契约中去掉。

## 扩展测试

把以下测试追加到 orders.cv，保留前面的类型、函数和顶层语句：

```carven
test "purchase reduces stock" {
    var item: Item = { name: "Lamp", price: 1200, stock: 3 };
    let receipt = try {
        purchase(&item, 2)?
    } catch {
        _ => ({}),
    };

    check(receipt.quantity == 2);
    check(receipt.amount == 2400);
    check(item.stock == 1);
}

test "failed purchase preserves stock" {
    var item: Item = { name: "Lamp", price: 1200, stock: 1 };
    let available = try {
        purchase(&item, 2)?;
        -1
    } catch {
        InvalidQuantity(_) => -1,
        OutOfStock(error) => error.available,
    };

    check(available == 1);
    check(item.stock == 1);
}

test {
    var item: Item = { name: "Lamp", price: 1200, stock: 0 };
    let receipt = try {
        reserve(&item, 1)?
    } catch {
        InvalidQuantity(_) => Receipt { quantity: -1, amount: -1 },
    };

    check(receipt.amount == 0, "backorders are not charged");
}
```

```sh
carven --tests orders.cv
```

reserve 的缺货提示打印到 stdout，汇总写到 stderr：

```text
Backorder: 1 requested, 0 available
carven: tests: 3 passed; 0 failed
```

测试模式跳过顶层语句。前两条测试直接调用 purchase，第三条匿名测试检查 reserve 的恢复。结构体没有隐式相等，因此成功测试分别检查数量与金额。同样的测试也可以用 `carven interpret --tests orders.cv` 运行。

## 读失败报告

交换 purchase 的前两条语句，让库存在 quote 校验之前扣减：

```carven
    item.stock -= quantity;
    let amount = quote(item, quantity)?;
```

这段代码替换 purchase 中对应的两行。再次运行 `carven --tests orders.cv`，两条测试失败。stdout 输出 `Backorder: 1 requested, -1 available`，stderr 为：

```text
orders.cv:71:5: error: check failed
  test:
    module: orders
    name: purchase reduces stock
  condition: receipt.quantity == 2
  operands:
    receipt.quantity: 0

orders.cv:72:5: error: check failed
  test:
    module: orders
    name: purchase reduces stock
  condition: receipt.amount == 2400
  operands:
    receipt.amount: 0

orders.cv:86:5: error: check failed
  test:
    module: orders
    name: failed purchase preserves stock
  condition: available == 1
  operands:
    available: -1

orders.cv:87:5: error: check failed
  test:
    module: orders
    name: failed purchase preserves stock
  condition: item.stock == 1
  operands:
    item.stock: -1

carven: tests: 1 passed; 2 failed
```

前两份报告显示数量与金额都是零：quote 看到的是已扣减的库存，拒绝了请求，purchase 因此落入恢复分支。两次检查属于同一条失败测试，后两份报告属于另一条失败测试。尽管调用失败，扣减已经发生，语言不会撤销它。继续之前恢复原来的顺序。

## 独立完成的扩展

增加 DeliveryError 与配送费用函数，组合到 quote 的成功价格。先决定配送失败应当发生在扣库存之前还是之后，再安排调用顺序。增加一条测试证明你的选择。若发生在扣减之后，需要业务自行补偿；不要仅靠扩大 throw 契约假设库存会恢复。

金额乘法使用 `i32` 回绕规则。面向实际订单系统时，还需验证金额上界，并按业务设计独立的金额溢出失败。
