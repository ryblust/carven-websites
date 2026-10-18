---
title: "Exercise: inventory requests"
description: "Practise classes, owned constants, and typed recovery with a small inventory batch."
section: learn
lesson: 17
source: docs/language/tutorial.md
---

## Run the inventory batch

Practise [classes and access](/learn/ownership/#control-field-access-with-a-class), [owned constants](/learn/constants/), and [failure recovery](/learn/failures/). Process four purchase requests: deduct stock and keep a receipt on success, record shortages as backorders, and report other rejected requests before continuing.

Amounts use minor currency units, with a limit of 100000 per purchase. Prices and initial stock must be nonnegative. The fixed request indices refer to existing products. Save this complete program as orders.cv:

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

Run `carven orders.cv` or `carven interpret orders.cv`. Both print:

```text
Backorder: 2 1
Invalid quantity: 0
Lamp: 2 units, 2400
Desk: 4 units, 100000
Paid: 2 Total: 102400
Stock: 1 0
```

Check these relationships in the source:

- `Stock::purchase` validates quantity, amount, and availability before changing stock. A typed failure leaves stock unchanged. Both i32 operands are widened before multiplication.
- `catalog` is built during compilation; `inventory` owns a writable copy. Each Receipt owns its product name and can be retained independently of that inventory.
- The private reserve helper recovers OutOfStock as a Backorder and infers its remaining failures. The loop handles those failures. Earlier successful purchases remain committed when a later request fails.

## Check and extend the rules

Append this static test and run `carven check orders.cv`. It checks the inclusive amount limit, stock mutation, and independence of the catalog copy:

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

Use the [testing lesson](/learn/testing/) to add ordinary tests for these cases:

1. Zero quantity and an amount above the limit each report the expected failure payload and preserve stock.
2. A purchase followed by an oversized request produces a Backorder with the requested and available counts, leaving the remaining stock unchanged.

Run the added tests with `carven --tests orders.cv` or `carven interpret --tests orders.cv`.

For a further exercise, add a restock method. Require a positive quantity and check that the new count fits i32 before changing it. Test both a successful update and a rejection that preserves stock. The [JSON input project](/learn/data-pipeline/) shows how to replace fixed requests with bounded input.
