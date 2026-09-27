---
title: "Project: update stock only after success"
description: "Combine validation, Write updates, typed failures with selective recovery, assertions, and tests in a runnable program."
section: learn
lesson: 15
source: docs/semantics.md
---

## The task and its rules

Implement a small order system: quantity must be positive and stock sufficient. Validation failure must not reduce stock; reduce it only after success. A shortage becomes a backorder that charges nothing, while an invalid quantity stays an error for the caller. Use integer minor currency units to keep floating-point representation outside this exercise.

Save as orders.cv:

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

Run `carven orders.cv`. Expect:

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

`carven interpret orders.cv` prints the same lines without invoking a C++ compiler.

## Why stock remains 1 after failure

quote validates before returning a price. purchase modifies stock only after `?` obtains a success value. The second purchase fails inside quote and skips the reduction. Code order ensures this business behavior; the language does not provide automatic transaction rollback.

After the reduction, assert states an invariant: stock never goes negative. It is not a recoverable failure. If a later edit breaks the order of checks, the program stops at the assertion with its condition, operand values, and message instead of continuing with bad stock. See [Assert program invariants](/learn/testing/#assert-program-invariants).

## Access modes and payloads

quote uses Read to inspect Item. purchase and reserve use Write to update the original object, with `&item` at each call site. Failures retain the requested quantity and available stock so handlers can display context. Success values and failure types are separately constrained by signatures.

The receipt and the stock item use contextual construction. `return { quantity: quantity, amount: amount };` takes its type from purchase's `Receipt` result, not from the failure set. `var lamp: Item = { ... }` takes its type from the annotation. In reserve's catch arm, `({})` builds an empty Receipt; a bare `{}` at the start of an arm body would be an empty block.

## Recover selectively

reserve handles only OutOfStock and turns it into an empty receipt. Its contract, `throw InvalidQuantity`, forwards the remaining failure. The top-level statements form an implicit entry, which infers its outward failures: `reserve(&lamp, 2)?` may pass InvalidQuantity outward without a throw clause. The final try recovers it explicitly and prints the payload.

Remove the `OutOfStock(error)` arm from reserve and run `carven check orders.cv`: `CV-EFFECT-SIGNATURE-BOUND` reports that the body exceeds its declared contract, because OutOfStock would now escape. A function can remove a failure from its contract only by handling it.

## Extend the tests

Append these tests to orders.cv, keeping its types, functions, and top-level statements:

```carven
test "purchase reduces stock" {
    var item: Item = { name: "Lamp", price: 1200, stock: 3 };
    let receipt = try {
        purchase(&item, 2)?
    } catch {
        _ => ({}),
    };

    check(receipt == Receipt { quantity: 2, amount: 2400 });
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

The backorder line from reserve prints on stdout; the summary goes to stderr:

```text
Backorder: 1 requested, 0 available
carven: tests: 3 passed; 0 failed
```

Test mode skips the top-level statements. The first two tests call purchase directly, and the anonymous third test checks reserve's recovery. Struct values compare field by field, so `receipt == Receipt { ... }` checks the whole receipt. The same tests also run with `carven interpret --tests orders.cv`.

## Read a failing report

Swap the first two statements in purchase so stock is reduced before quote validates the request:

```carven
    item.stock -= quantity;
    let amount = quote(item, quantity)?;
```

This fragment replaces the matching lines in purchase. Run `carven --tests orders.cv` again. Two tests fail. stdout shows `Backorder: 1 requested, -1 available`, and stderr shows:

```text
orders.cv:71:5: error: check failed
  test:
    module: orders
    name: purchase reduces stock
  condition: receipt == Receipt { quantity: 2, amount: 2400 }
  operands:
    receipt: Receipt {
        quantity: 0,
        amount: 0,
    }
    Receipt { quantity: 2, amount: 2400 }: Receipt {
        quantity: 2,
        amount: 2400,
    }

orders.cv:85:5: error: check failed
  test:
    module: orders
    name: failed purchase preserves stock
  condition: available == 1
  operands:
    available: -1
    1: 1

orders.cv:86:5: error: check failed
  test:
    module: orders
    name: failed purchase preserves stock
  condition: item.stock == 1
  operands:
    item.stock: -1
    1: 1

carven: tests: 1 passed; 2 failed
```

The first report shows the entire receipt on each side: quote now sees the reduced stock and rejects the request, so purchase falls into the recovery arm. The next two reports come from the same test and count as one failed case. The reduction happened even though the call failed; the language does not undo it. Restore the original order before continuing.

## Extend it yourself

Add DeliveryError and a delivery-fee function, combining the fee with quote's success price. Decide whether delivery failure should occur before or after stock reduction, then order calls accordingly. Add a test proving that choice. If failure occurs after reduction, the business code needs compensation; widening the throw contract does not restore stock.

Amount multiplication still follows i32 wrapping rules. A real order system also needs amount limits and a separately designed amount-overflow failure.
