---
title: "Organize calculations with functions"
description: "Name calculations, declare parameter types, and make return paths explicit."
section: learn
lesson: 3
source: docs/semantics.md
---

## Give a computation a name

```carven
fn line_total(price: i32, quantity: i32) -> i32 => price * quantity;

fn discount(total: i32) => total - 3;

println(discount(line_total(12, 3)));
```

The output is `33`. Declarations and top-level statements can share a file: the functions are declarations, and the final `println` is the program entry. Ordinary parameter types are mandatory. `=> expression;` is an expression body: the function returns that expression's value. line_total states its `i32` result; discount infers `i32` from its expression. Expression bodies are the usual form for short calculations.

## Return explicitly from a block

When a calculation needs several statements, write a block body. The last expression in an ordinary function block does not return automatically. Every normal path through a value-returning function needs return:

```carven
fn delivery(total: i32) -> i32 {
    if total >= 100 {
        return 0;
    }

    return 8;
}

println(delivery(36));
```

The output is `8`. An explicit result type supplies context to literals in each return. Without a result annotation, each return is inferred independently and the results must agree. The first return does not choose a numeric type for later ones.

A value-producing if is an expression, so this choice also fits an expression body:

```carven
fn delivery(total: i32) -> i32 => if total >= 100 { 0 } else { 8 };

println(delivery(36), delivery(120));
```

The output is `8 0`. Choose a block when the function needs local steps or early returns; choose `=>` when one expression states the result.

## Functions that perform an action

A function that returns no value infers void:

```carven
fn show_total(total: i32) {
    println("Total:", total);
}

show_total(36);
```

The output is `Total: 36`. Call show_total as a statement; there is no value to save in a local binding. A bare `return;` can finish such a function early.

## Declaration order and calls

A function may call another defined later in the same module, and top-level statements may call a function declared below them. Carven collects declarations before checking bodies. Calls select the function first, then evaluate arguments once each from left to right.

Functions do not see top-level `let` and `var` bindings: those belong to the program entry. Pass required values as parameters.

For mutually recursive functions, write explicit result types so checking one result does not depend on inferring the other. See the [function Reference](/reference/functions/) for the full inference rules. The [access chapter](/learn/ownership/) will show when a parameter reads a saved value and when it retains the caller's storage.

## Exercise

Add `grand_total(price, quantity)` using line_total and delivery. Inputs 12 and 3 should give 44; 50 and 2 should give 100. Start with a block body that saves the line total in a `let` and returns it plus delivery, then check whether an expression body stays readable.
