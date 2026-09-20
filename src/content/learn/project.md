---
title: "Project: update stock only after success"
description: "Combine structs, failures, Write updates, and text output in a runnable program."
section: learn
lesson: 15
source: docs/semantics.md
---

## The task and its rules

Implement a small order quote system: quantity must be positive and stock sufficient. Validation failure must not reduce stock; reduce it only after success. Use integer minor currency units to keep floating-point representation outside this exercise.

Save as orders.cv:

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

Run `carven orders.cv`. Expect:

```text
Paid: 2400; remaining: 1
Requested: 2 available: 1
Remaining: 1
```

## Why stock remains 1 after failure

quote validates before returning a price. purchase modifies stock only after `?` obtains a success value. The second call fails inside quote and skips the reduction. Code order ensures this business behavior; the language does not provide automatic transaction rollback.

## Access modes and payloads

quote uses Read to inspect Item. purchase uses Write to update the original object, with &item at the call site. Failures retain requested quantity and available stock so handlers can display context. Success amounts and failure types are separately constrained by signatures.

## Extend the tests

Append this test to the original orders.cv, keeping its types, functions, and main:

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
carven --tests orders.cv
```

Test mode executes the test and skips main, so it does not run the earlier purchase demonstration. purchase uses a Write parameter; use native test mode.

## Extend it yourself

Add DeliveryError and a delivery-fee function, combining the fee with quote's success price. Decide whether delivery failure should occur before or after stock reduction, then order calls accordingly. Add a test proving that choice. If failure occurs after reduction, the business code needs compensation; widening the throw contract does not restore stock.

Amount multiplication still follows i32 runtime wrapping rules. A real order system also needs amount limits and a separately designed amount-overflow failure.
