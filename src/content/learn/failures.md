---
title: "Recoverable failures and contracts"
description: "Define failures with data, propagate at calls, and recover where business context is available."
section: learn
lesson: 9
source: docs/semantics.md
---

## Start with validation

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

The output is `Invalid quantity: 0` followed by `Total: 0`. The failure type is a struct carrying the rejected value. `throw InvalidQuantity` in the signature is an upper bound; the `throw ...;` statement actually produces a failure.

## Success values and propagation

Calling a fallible function creates a pending failure obligation. `?` yields the success value or transfers failure to the nearest enclosing try or callable failure target. The first failure skips the rest of the current evaluation path: `(first() + second())?` does not call second if first fails.

Applying ? to an expression that cannot fail is a compile error. When a private function changes to infer an empty set, callers must remove their ?. Even if a function explicitly declaring E currently always succeeds, callers still obey the E contract.

## Inference and publication

A private non-entry function or lambda may omit its throw clause and infer the least failure set, including recursive dependencies. Ordinary bare functions, export functions, and main must explicitly declare escaping failures; private main is no exception.

Write a set as `throw A + B`. Order is irrelevant, and types cannot repeat. Failure payloads must be copyable nominal structs or enums.

## Partial recovery and rethrow

A function with an explicit throw contract may handle some failures and propagate the rest. `_ => rethrow` explicitly forwards the remaining original payload; `throw NewError { ... }` translates it into another failure. The final set is still bounded by the outer contract. A wildcard rethrow cannot bypass that bound.

Failures produced by a handler or guard go to the outer target, not back into the same try. A false guard continues to the next arm. A pattern covering only some enum payload values leaves the others to account for.

## Recover only what you can handle

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

The output is `12`. price_or_default recovers MissingPrice with a default price. The remaining ServiceUnavailable automatically propagates to its enclosing function target, so the caller only handles that failure. Change the argument in main to false to get `0`.

Adding `_ => rethrow,` after the MissingPrice arm preserves the same residual set. Omitting it is valid here because price_or_default declares a contract accepting ServiceUnavailable. A main without an escaping contract must handle all its own failures.

## Side effects and entry status

Failure does not roll back completed mutations. Locals are cleaned up according to control flow, and borrowed data in a failure payload must retain valid backing. C++ exceptions, dynamic bounds violations, and division-by-zero termination are not typed failures.

If a declared failure escapes main, the process reports failure without automatically printing its payload. Catch and print it yourself when a readable message is needed. An ordinary returned integer is not an exit code.

## Exercise

Set the quantity to 3; expect only Total: 36. Add a TooExpensive failure to limit the total price, and update the signature and main's handling. Omit that handler to inspect the boundary diagnostic.
