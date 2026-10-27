---
title: "Calculations with functions"
description: "Name calculations, declare parameter types, and make return paths explicit."
section: learn
lesson: 4
source: docs/language/functions.md
---

## Give a computation a name

Calculate a line total, apply a discount, and print the result. Give each calculation its own function:

```carven run
fn line_total(price: i32, quantity: i32) -> i32 => price * quantity;

fn discount(total: i32) => total - 3;

println(discount(line_total(12, 3)));
```

The output is `33`. Declarations and top-level statements can share a file: the functions are declarations, and the final `println` is the program entry. Ordinary parameter types are mandatory. `=> expression;` is an expression body: the function returns that expression's value. `line_total` states its `i32` result; discount infers `i32` from its expression. Expression bodies are the usual form for short calculations.

## Return explicitly from a block

When a calculation needs several statements, write a block body. The last expression in an ordinary function block does not return automatically. Every normal path through a value-returning function needs return:

```carven run
fn delivery(total: i32) -> i32 {
    if total >= 100 => return 0;

    return 8;
}

println(delivery(36));
```

The output is `8`. The explicit result type supplies `i32` to the returned literals. See the [function reference](/reference/functions/) for result inference when the annotation is omitted.

A value-producing if is an expression, so this choice also fits an expression body:

```carven run
fn delivery(total: i32) -> i32 => if total >= 100 { 0 } else { 8 };

println(delivery(36), delivery(120));
```

The output is `8 0`. Choose a block when the function needs local steps or early returns; choose `=>` when one expression states the result.

## Functions that perform an action

Some functions perform an action instead of calculating a useful result. Their result type is `void`:

```carven run
fn show_total(total: i32) => println("Total:", total);

show_total(36);
```

The output is `Total: 36`. Call show_total as a statement because its purpose is printing. The compiler infers `void`, so `-> void` is optional. Use a block when an action needs several statements or an early `return;`.

`void` has one value, `()`, called unit. The `async` chapter uses it for operations without a business result.

## Declaration order and calls

A function may call another defined later in the same module, and top-level statements may call a function declared below them. Carven collects declarations before checking bodies. Calls select the function first, then evaluate arguments once each from left to right.

Functions do not see top-level `let` and `var` bindings: those belong to the program entry. Pass required values as parameters.

The [function reference](/reference/functions/) covers recursive calls and result inference. The [access chapter](/learn/ownership/) introduces parameters that read, modify, or take the caller's value.

## Return related results together

A function can return a tuple when its results belong together. It can also accept a tuple as one argument and name its parts in the parameter list:

```carven run
fn delivery(total: i32) -> i32 => if total >= 100 { 0 } else { 8 };
fn amount((price, quantity): (i32, i32)) -> i32 => price * quantity;
fn price_and_delivery(total: i32) -> (i32, i32) => (total, delivery(total));

let (items, shipping) = price_and_delivery(amount((12, 3)));
println(items, shipping, items + shipping);
```

Save this as a separate program. It prints `36 8 44`. `(i32, i32)` states the types of the two positions. The pair passed to `amount` is one argument, not two separate arguments. Use a struct when names such as price and quantity should remain part of the value wherever it goes; use a tuple for a short local combination.

## Exercise

Start a new program with `line_total` from the first example and either version of `delivery`. Add `grand_total(price, quantity)` using those two functions. Print calls with inputs 12 and 3, then 50 and 2; expect `44` and `100`. Start with a block body that saves the line total in a `let` and returns it plus delivery, then check whether an expression body stays readable.
