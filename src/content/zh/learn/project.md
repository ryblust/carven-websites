---
title: "实践：成功后才扣减库存"
description: 用明确的订单结果、金额上限、选择性失败恢复，以及静态和运行时测试，完成订单流程。
section: learn
lesson: 15
source: docs/language/tutorial.md
---

## 任务与规则

完成一个小型订单流程。数量必须为正，库存必须足够，总金额不能超过 100000 个货币最小单位。商品单价和库存非负是程序不变量。所有拒绝的订单都必须保留库存；成功购买才扣减一次。

库存不足时转为缺货预订，保存请求数量和可用数量，不产生已付款收据，也不收费。无效数量和超额订单仍作为错误交给调用者。用枚举明确区分这两种流程结果，避免用全零收据暗示“没有购买”。

保存为 orders.cv：

```carven
struct Item {
    name: str,
    price: i32,
    stock: i32,
}

struct Receipt {
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

const fn quote(item: Item, quantity: i32) -> i64 throw InvalidQuantity + OrderLimit + OutOfStock {
    if quantity <= 0 {
        throw InvalidQuantity { requested: quantity };
    }

    assert(item.price >= 0 && item.stock >= 0, "catalog entries must be nonnegative");
    let amount = (item.price as i64) * (quantity as i64);
    if amount > order_limit {
        throw OrderLimit { amount: amount, limit: order_limit };
    }

    if quantity > item.stock {
        throw OutOfStock { requested: quantity, available: item.stock };
    }

    return amount;
}

fn purchase(&item: Item, quantity: i32) -> Receipt throw InvalidQuantity + OrderLimit + OutOfStock {
    let amount = quote(item, quantity)?;

    item.stock -= quantity;
    assert(item.stock >= 0, f"{item.name} stock fell to {item.stock}");

    return { quantity: quantity, amount: amount };
}

fn reserve(&item: Item, quantity: i32) -> OrderResult throw InvalidQuantity + OrderLimit => try {
    .Paid(purchase(&item, quantity)?)
} catch {
    OutOfStock(error) => .Backorder(error),
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
OrderResult::Paid(
    Receipt {
        quantity: 2,
        amount: 2400,
    },
)
OrderResult::Backorder(
    OutOfStock {
        requested: 2,
        available: 1,
    },
)
Remaining: 1
Invalid quantity: 0
```

`carven interpret orders.cv` 不调用 C++ 编译器，输出相同。枚举、载荷及嵌套字段直接打印，不需要自定义格式化器。

## 修改状态之前完成校验

quote 读取 Item，返回已校验的金额或类型化失败。先检查数量，再检查金额上限，最后检查库存。这个顺序决定多个规则同时不满足时报告哪个错误：即使库存也不足，超额订单仍保持为 OrderLimit。

purchase 使用 Write 访问，调用处重复写 `&item`。它的 `?` 必须先拿到 quote 的成功值，下一条语句才扣减库存。第二次购买在 quote 中失败，因此库存仍为 1。业务保证来自语句顺序；Carven 没有自动事务回滚。

断言承担另一种责任：商品数据为负是程序错误，成功扣减之后库存也必须非负。断言停止执行，不产生可恢复失败。插值消息只在失败时求值。参见[用 assert 检查程序不变量](/zh/learn/testing/#用-assert-检查程序不变量)。

金额使用 `i64`：非负的 `i32` 单价和正的 `i32` 数量都在乘法**之前**扩大类型，因此乘积放得下。100000 上限是独立的业务规则。先以 `i32` 相乘再转换结果，会在转换之前发生 `i32` 回绕。

## 明确结果，选择性恢复

purchase 返回 Receipt。上下文构造 `return { quantity: quantity, amount: amount };` 从结果签名取得类型；带 Item 标注的绑定也为构造提供类型。

reserve 使用表达式函数体和上下文枚举构造：OrderResult 结果类型为 `.Paid(...)` 和 `.Backorder(...)` 提供类型。它只处理 OutOfStock，把原载荷保存在 Backorder 中。契约仍声明 `throw InvalidQuantity + OrderLimit`。缺货预订是已经处理的结果；另外两种错误仍通过 `?` 传出。

顶层语句构成隐式入口，会推断向外失败。最后的 try 处理 InvalidQuantity 并打印载荷；若 OrderLimit 逃出入口，程序会以失败状态结束。调用者也可以选择处理它。

要观察失败契约，临时把 reserve 的函数体替换为：

```carven
fn reserve(&item: Item, quantity: i32) -> OrderResult throw InvalidQuantity + OrderLimit =>
    .Paid(purchase(&item, quantity)?);
```

`carven check orders.cv` 用 `CV-EFFECT-SIGNATURE-BOUND` 拒绝它：OutOfStock 现在会逃出，但函数契约没有声明它。继续之前恢复 catch。

## 在边界处验证规则

quote 声明为 `const fn`，因为校验使用受支持的静态操作，不修改调用者状态。purchase 在运行时调用同一个函数。把以下测试追加到 orders.cv，保留类型、函数和顶层语句：

```carven
const test "order limit is inclusive" {
    const item: Item = { name: "Desk", price: 25000, stock: 4 };
    let amount = try {
        quote(item, 4)?
    } catch {
        _ => fail("a quote at the limit must succeed"),
    };

    check(amount == order_limit);
}

test "purchase reduces stock" {
    var item: Item = { name: "Lamp", price: 1200, stock: 3 };
    let receipt = try {
        purchase(&item, 2)?
    } catch {
        _ => fail("purchase must succeed"),
    };

    check(receipt.quantity == 2);
    check(receipt.amount == 2400);
    check(item.stock == 1);
}

test "shortage becomes a backorder" {
    var item: Item = { name: "Lamp", price: 1200, stock: 1 };
    let result = try {
        reserve(&item, 2)?
    } catch {
        _ => fail("a shortage must be recovered"),
    };

    match result {
        .Backorder(error) => {
            check(error.requested == 2);
            check(error.available == 1);
        },
        .Paid(_) => fail("a shortage must not produce a paid receipt"),
    }
    check(item.stock == 1);
}

test "invalid quantity preserves stock" {
    var item: Item = { name: "Lamp", price: 1200, stock: 3 };
    try {
        reserve(&item, 0)?;
        fail("zero quantity must be rejected");
    } catch {
        InvalidQuantity(error) => check(error.requested == 0),
        _ => fail("expected InvalidQuantity"),
    }
    check(item.stock == 3);
}

test "over-limit order preserves stock" {
    var item: Item = { name: "Desk", price: 25000, stock: 5 };
    try {
        reserve(&item, 5)?;
        fail("an over-limit order must be rejected");
    } catch {
        OrderLimit(error) => {
            check(error.amount == 125000);
            check(error.limit == order_limit);
        },
        _ => fail("expected OrderLimit"),
    }
    check(item.stock == 5);
}
```

静态测试验证金额恰好等于上限时可接受。它在分析期间执行，包括 `carven check orders.cv`，不会生成运行时测试入口。四条普通测试分别验证成功购买、缺货恢复、零数量和超过上限的金额。拒绝路径同时检查选中的失败载荷和未改变的库存。

遇到非预期结果时，`fail` 直接停止当前测试，不用回退收据或哨兵值掩盖问题。Backorder 的 match 检查两个枚举分支；增加 OrderResult 分支后，需要更新这个 match。结构体没有隐式相等，因此分别检查收据字段。

用任一种模式运行普通测试：

```sh
carven --tests orders.cv
carven interpret --tests orders.cv
```

两种模式都跳过顶层应用语句，在 stderr 打印：

```text
carven: tests: 4 passed; 0 failed
```

## 读一次失败检查

在成功购买测试中，临时把 `check(item.stock == 1);` 改成 `check(item.stock == 2);`。实现仍留下一个商品，因此测试失败。源位置之后的报告片段为：

```text
  test:
    module: orders
    name: purchase reduces stock
  condition: item.stock == 2
  operands:
    item.stock: 1

carven: tests: 3 passed; 1 failed
```

条件保留检查的源码文字；操作数展示观察到的库存，不会再次读取它。字面量 2 已经在条件中出现，因此无需另列操作数。继续之前把预期值恢复为 1。

## 独立完成的扩展

增加 DeliveryError 和配送费用函数。金额上限的判断也要包含运费，并决定配送失败发生在扣库存之前还是之后。增加一条测试，连同库存值一起证明你选择的行为。若失败发生在扣减之后，业务代码需要补偿；扩大 throw 契约不会恢复库存。

要扩展为批量订单，可以遍历请求数量数组，match 每个 OrderResult，只累计 Paid 收据的金额。无效请求继续作为类型化失败，不要静默转为缺货预订。固定策略数据可在能简化准备时使用静态执行。
