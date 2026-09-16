---
title: "Organize calculations with functions"
description: "Name calculations, declare parameter types, and make return paths explicit."
section: learn
lesson: 3
source: docs/semantics.md
---

## Give a computation a name

```carven
fn line_total(price: i32, quantity: i32) -> i32 {
    return price * quantity;
}

fn discount(total: i32) => total - 3;

fn main() {
    println(discount(line_total(12, 3)));
}
```

The output is `33`. Ordinary parameter types are mandatory. discount infers an i32 result from its expression. `=> expression;` returns a single expression and works well for short calculations.

## Return explicitly from a block

The last expression in an ordinary function block does not return automatically. Every normal path through a value-returning function needs return:

```carven
fn delivery(total: i32) -> i32 {
    if total >= 100 {
        return 0;
    }

    return 8;
}

fn main() {
    println(delivery(36));
}
```

The output is `8`. An explicit result type supplies context to literals in each return. Without a result annotation, each return is inferred independently and the results must agree. The first return does not choose a numeric type for later ones.

## Functions that perform an action

A function that returns no value infers void:

```carven
fn show_total(total: i32) {
    println("Total:", total);
}

fn main() {
    show_total(36);
}
```

The output is `Total: 36`. Call show_total as a statement; there is no value to save in a local binding. A bare `return;` can finish such a function early.

## Declaration order and calls

A function may call another defined later in the same module. Carven collects declarations before checking bodies. Calls select the function first, then evaluate arguments once each from left to right.

For mutually recursive functions, write explicit result types so checking one result does not depend on inferring the other. See the [function Reference](/reference/functions/) for the full inference rules. The [access chapter](/learn/ownership/) will show when a parameter reads a saved value and when it retains the caller's storage.

## Exercise

Add `grand_total(price, quantity)` using line_total and delivery. Inputs 12 and 3 should give 44; 50 and 2 should give 100. Start with an explicit return, then write an equivalent expression body.
