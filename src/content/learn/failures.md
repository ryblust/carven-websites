---
title: "Combine failures and narrow contracts"
description: "Define failures with data, propagate at calls, and recover where business context is available."
section: learn
lesson: 9
source: docs/semantics.md
---

## Start with validation

Save this as quantity.cv:

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

let total = try {
    line_total(12, 0)?
} catch {
    InvalidQuantity(error) => {
        println("Invalid quantity:", error.value);
        0
    },
};

println("Total:", total);
```

Run `carven quantity.cv`. The output is `Invalid quantity: 0` followed by `Total: 0`. The failure type is a struct carrying the rejected value. `throw InvalidQuantity` in the signature is an upper bound; the `throw ...;` statement actually produces a failure. A throw statement does not supply an expected type, so it names the failure type instead of using contextual `{ value: quantity }` construction.

## Success values and propagation

Calling a fallible function creates a pending failure obligation. `?` yields the success value or transfers failure to the nearest enclosing try or callable failure target. The first failure skips the rest of the current evaluation path: `(first() + second())?` does not call second if first fails.

Applying ? to an expression that cannot fail is a compile error. When a private function changes to infer an empty set, callers must remove their ?. Even if a function explicitly declaring E currently always succeeds, callers still obey the E contract.

## Inference and publication

The preceding module chapter introduced private helpers and published interfaces. A private non-entry function may omit its throw clause: the compiler infers the failures its body can propagate. Top-level statements, which form the implicit entry, infer their outward failures the same way. Closures, introduced next, can also infer their failures.

Replace the try expression and final `println` in quantity.cv with two direct calls:

```carven
println("Total:", line_total(12, 3)?);
println("Total:", line_total(12, 0)?);
```

This fragment depends on the struct and line_total above. The program prints `Total: 36`, then the second call's InvalidQuantity leaves the implicit entry. The process exits with a failure status without printing the payload. No throw clause is needed on top-level statements.

Ordinary bare functions, export functions, and an explicit main must declare escaping failures; private main is no exception. Moving the same two lines into `fn main() { ... }` without `throw InvalidQuantity` reports `CV-EFFECT-THROW-PUBLISHED`.

Write a set as `throw A + B`. Order is irrelevant, and types cannot repeat. Failure payloads must be copyable nominal structs or enums.

## Partial recovery and rethrow

A function with an explicit throw contract may handle some failures and propagate the rest. `_ => rethrow` explicitly forwards the remaining original payload; `throw NewError { ... }` translates it into another failure. The final set is still bounded by the outer contract. A wildcard rethrow cannot bypass that bound.

Failures produced by a handler or guard go to the outer target, not back into the same try. A false guard continues to the next arm. A pattern covering only some enum payload values leaves the others to account for.

## Recover only what you can handle

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

private fn quote(has_price: bool, online: bool) -> i32 => (price(has_price) + fee(online))?;

fn total(has_price: bool, online: bool) -> i32 throw Offline => try {
    quote(has_price, online)?
} catch {
    MissingPrice(_) => 12,
};

fn main() {
    let price = try {
        total(false, true)?
    } catch {
        Offline(_) => 0,
    };

    println(price);
}
```

The output is `12`. quote combines two ordinary success values with `+` and uses one `?` for the composed expression. Its private contract is inferred as MissingPrice + Offline. If price fails, fee is not called. Both quote and total use expression bodies: `=>` returns the value of the expression, including a whole try expression.

total recovers MissingPrice with a default total. Its public contract contains only Offline, which is all main must handle. No new aggregate error type is declared for the combination.

Try `(true, true)` in main to get `17`, then `(true, false)` to get `0`. `(false, false)` still gives `12`: the missing price stops evaluation before the service call. The contract lists possible failures; it does not force all operations to run.

Adding `_ => rethrow,` after the MissingPrice arm preserves the same residual set. Omitting it is valid here because total declares a contract accepting Offline. This example uses an explicit main, which has no throw clause, so main must handle all its own failures.

Save the complete program above as quote.cv and run `carven quote.cv`. Change the two arguments to total in main and check the results below. Use the same inputs in the C++ comparison that follows.

| has_price | online | Output | Path                                 |
| --------- | ------ | ------ | ------------------------------------ |
| true      | true   | 17     | Both steps succeed                   |
| false     | true   | 12     | Recover missing price; skip fee      |
| true      | false  | 0      | Forward Offline for main to recover  |
| false     | false  | 12     | price fails first; fee is not called |

### When a caller forgets a failure

Replace main in quote.cv with a version that calls quote directly but handles only MissingPrice:

```carven
fn main() {
    let price = try {
        quote(false, true)?
    } catch {
        MissingPrice(_) => 12,
    };

    println(price);
}
```

`carven quote.cv` now stops before generating C++. Among the reported errors:

```text
error [CV-EFFECT-CATCH-NON-EXHAUSTIVE]: catch does not cover every protected failure
 --> quote.cv:27:17
   |
27 |     let price = try {
   |                 ^^^^^
   | ...
31 |     };
   | ^^^^^
note: failure type not fully covered: quote.Offline
```

The note names the uncovered type with its module. The same run also reports `CV-EFFECT-THROW-PUBLISHED` at main, because the residual Offline would escape an explicit entry without a throw clause. Add an `Offline(_) => 0,` arm, or declare `fn main() throw Offline`, to resolve both. At the top level, the same try would instead forward Offline out of the implicit entry. Restore the original main before continuing.

## Preserve the same failures in C++23

This complete program preserves the preceding example's results, failure types, and operation order. price and fee each have one failure; quote combines them; total handles only MissingPrice:

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

Save as quote.cpp, compile with `c++ -std=c++23 quote.cpp -o quote` using a toolchain with C++23 expected support, and run `./quote` to get `12`. Try the four input pairs from the Carven example: the results match.

Follow the call order: C++ quote checks price before calling fee, placing each error into Error. Carven's composed expression and `?` describe the same short-circuit path. In total, C++ extracts the remaining Offline into a new expected; Carven checks the residual failure set against catch coverage.

C++ combinators or result libraries can encapsulate these branches too. Explicit code makes the correspondence between types and control flow visible here. Carven makes the composition rules part of the language, so private functions need no separately declared aggregate error type.

Keep total's interface limited to Offline: replace its Carven body with `=> quote(has_price, online)?;` and remove the MissingPrice if branch in C++. Carven reports `CV-EFFECT-SIGNATURE-BOUND`: the body exceeds the declared contract. The C++ above still compiles, but the remaining `std::get<Offline>` throws std::bad_variant_access when the price is missing: the return type does not prove which alternative the variant holds. Carven checks both the failure types and the coverage of the recovery branches.

## Side effects and entry status

Failure does not roll back completed mutations. Locals are cleaned up according to control flow, and borrowed data in a failure payload must retain valid backing. C++ exceptions, dynamic bounds violations, and division-by-zero termination are not typed failures.

If a failure escapes an implicit entry or an explicit main, the process reports failure status without automatically printing its payload. Catch and print it yourself when a readable message is needed. An ordinary returned integer is not an exit code.

## Exercise

In quantity.cv, set the quantity to 3; expect only `Total: 36`. Add a TooExpensive failure to limit the total price, update line_total's signature, and handle it in the top-level try. Then omit that handler: the implicit entry forwards TooExpensive and the process exits with a failure status. Move the statements into `fn main() { ... }` to inspect the boundary diagnostic instead.
