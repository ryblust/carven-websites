---
title: "Project: update stock only after success"
description: "Build an order workflow with explicit outcomes, amount limits, selective failure recovery, and static and runtime tests."
section: learn
lesson: 16
source: docs/language/tutorial.md
---

## The task and its rules

Build a small order workflow. A quantity must be positive, stock must be sufficient, and the total must not exceed 100000 minor currency units. Catalog prices and stock are nonnegative program invariants. Every rejected order must preserve stock; a successful purchase deducts it exactly once.

A shortage becomes a backorder. It carries the requested and available quantities, with no paid receipt or charge. Invalid quantities and excessive totals remain errors for the caller. An enum keeps these two successful workflow outcomes explicit instead of using a zero-valued receipt to mean “not purchased.”

Save as orders.cv:

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

Run `carven orders.cv`. Expect:

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

`carven interpret orders.cv` prints the same output without invoking a C++ compiler. The enum, its payload, and the nested fields are printed directly; no custom formatter is needed.

## Validate before changing state

quote reads Item and produces either a checked amount or a typed failure. It checks quantity first, then the amount limit, then availability. This order defines which error wins when several rules fail: an excessive total stays an OrderLimit even if stock is also insufficient.

purchase uses Write access, repeated as `&item` at the call site. Its `?` must obtain quote's success value before the next statement reduces stock. The second purchase fails in quote, so stock remains 1. This ordering is the business guarantee; Carven does not provide automatic transaction rollback.

The assertions serve a different purpose. Negative catalog data is a program bug; after a successful deduction, stock must still be nonnegative. An assertion stops execution instead of producing a recoverable failure. Its interpolated message is evaluated only on failure. See [Assert program invariants](/learn/testing/#assert-program-invariants).

The amount uses `i64`: both nonnegative `i32` price and positive `i32` quantity are widened **before** multiplication, so their product fits. The 100000 limit is a separate business rule. Multiplying in `i32` and casting the result afterwards would already have applied `i32` wrapping.

## Represent outcomes and recover selectively

purchase returns a Receipt. Its contextual construction, `return { quantity: quantity, amount: amount };`, takes its type from that result signature. The annotated Item bindings supply the type of their constructors in the same way.

reserve uses an expression body and contextual enum cases: its OrderResult result supplies the type of `.Paid(...)` and `.Backorder(...)`. It handles only OutOfStock, preserving its payload in the Backorder case. The contract still declares `throw InvalidQuantity + OrderLimit`. A backorder is a handled outcome; those two errors still propagate through `?`.

The top-level statements form an implicit entry that infers outward failures. The final try handles InvalidQuantity and prints its payload; an escaping OrderLimit would be reported with its structural payload on stderr and end the program with `EXIT_FAILURE`. A caller can choose to handle it too.

To inspect the failure contract, temporarily replace reserve's body with:

```carven
fn reserve(&item: Item, quantity: i32) -> OrderResult throw InvalidQuantity + OrderLimit =>
    .Paid(purchase(&item, quantity)?);
```

`carven check orders.cv` rejects it with `CV-EFFECT-SIGNATURE-BOUND`: OutOfStock now escapes a function whose contract omits it. Restore the catch before continuing.

## Test the rules at their boundaries

quote is a `const fn` because its validation uses supported static operations and has no mutation of caller state. The same function runs at runtime in purchase. Append these tests to orders.cv, keeping the types, functions, and top-level statements:

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

The static test accepts a quote exactly at the amount limit. It executes during analysis, including with `carven check orders.cv`, and generates no runtime test entry. The four ordinary tests cover a purchase, shortage recovery, zero quantity, and a total above the limit. The rejection tests check both the selected failure payload and unchanged stock.

`fail` stops a test if an unexpected outcome occurs, so no fallback receipt or sentinel value can disguise it. The Backorder match checks both enum cases; adding another OrderResult case will require updating that match. Structs have no implicit equality, so receipt fields are checked separately.

Run the runtime tests in either mode:

```sh
carven --tests orders.cv
carven interpret --tests orders.cv
```

Both skip the top-level application statements and print this summary on stderr:

```text
carven: tests: 4 passed; 0 failed
```

## Read a failing check

In the purchase test, temporarily change `check(item.stock == 1);` to `check(item.stock == 2);`. The implementation still leaves one item, so the test fails. After the source-location line, the report includes:

```text
  test:
    module: orders
    name: purchase reduces stock
  condition: item.stock == 2
  operands:
    item.stock: 1

carven: tests: 3 passed; 1 failed
```

The condition preserves the check's source text; the operand shows the observed stock without reading it again. The literal 2 is already visible in the condition, so it needs no separate operand line. Restore the expected value to 1.

## Extend it yourself

Add DeliveryError and a delivery-fee function. Include the fee in the amount-limit decision, and decide whether delivery failure occurs before or after stock reduction. Add one test that proves the chosen behavior, including the stock value. If failure occurs after reduction, business code must compensate; widening the throw contract does not restore stock.

For a batch extension, loop over an array of requested quantities, match each OrderResult, and total only Paid receipts. Keep invalid requests as typed failures rather than silently turning them into backorders. Use static execution for fixed policy data when it simplifies preparation.
