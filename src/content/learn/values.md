---
title: "Name and update values"
description: "Express data with `let`, `var`, `const`, and type annotations; understand literals and explicit conversions."
section: learn
lesson: 2
source: docs/language/types.md
---

## Store and update values

Save the following code as `main.cv` and run it with the command from the first chapter. It defines a unit price and quantity, updates the quantity, then calculates the subtotal:

```carven
let unit_price = 12;
var quantity = 2;
quantity += 1;
const tax_percent: i32 = 5;
let subtotal = unit_price * quantity;
println(subtotal, tax_percent);
```

The output is `36 5`. `unit_price` is declared with `let`, so it cannot be reassigned. `quantity` is declared with `var`, so `+=` can update it.

`tax_percent` is a `const`: its initializer must **complete at compile time**. Later uses refer to that computed value without creating a runtime variable.

Every declaration needs an initializer. To evaluate an expression and discard its result, use `let _ = ...`. Writing `let ignored = ...` still creates a binding named `ignored`. Discarding the result does not skip evaluation or cleanup.

## Choose a type

Integers include `i8` through `i64`, `u8` through `u64`, and pointer-width `isize`/`usize`. Floating-point types are `f32`/`f64`; booleans use `bool`. Unsuffixed integers default to `i32` and floating literals to `f64`. An integer literal can use the integer type in its annotation. A floating literal can similarly use an annotated floating type.

```carven
let count: u8 = 12;
let total = count as i32;
let fraction: f32 = 1.5;
println(count, total, fraction);
```

The output is `12 12 1.5`.

**Once a variable has a type, later uses do not change it.** In this example, `count` is a `u8`; converting it to `i32` requires an explicit `as`.

Conditions must have type `bool`, so `if 1` is invalid. To check whether a number is nonzero, write `value != 0` or explicitly convert it to `bool`.

## Integer arithmetic wraps

```carven
let small: u8 = 250;
let wrapped = small + 10;
const folded: u8 = 250 + 10;
println(wrapped, folded);
```

The output is `4 4`. Integer negation, addition, subtraction, multiplication, and left shifts wrap at the type's width. The runtime value and the compile-time constant follow the same rule, so moving a calculation into a `const` does not change its result. A literal must still fit its type: `let big: u8 = 300;` is rejected with `CV-CONST-LITERAL-RANGE`.

An integer conversion can wrap just like arithmetic; it does not check whether the original value fits. If business rules require a value between 0 and 100, compare first and convert afterward. Division by zero and invalid shifts stop runtime execution. During compilation, they produce a diagnostic instead. For example, `const broken: i32 = 10 / 0;` reports `CV-CONST-DIVIDE-BY-ZERO`. They are not catchable failures.

## Scope and shadowing

An inner scope may declare a name that shadows an outer one; a scope cannot declare the same name twice. A new name becomes available only after its initializer completes, so an inner `let value = value + 1;` can read the outer value. Ordinary functions do not implicitly capture caller or entry locals. Pass required values as parameters.

## Name the parts of a tuple

Sometimes two values belong together, but a whole new record type would add little. A tuple groups them in order; a matching pair of names takes them apart:

```carven
var (unit_price, quantity) = (1200, 3);
quantity += 1;
println(unit_price * quantity);
```

This prints `4800`. Both names are mutable because the declaration uses var. Use let when neither should change. The right-hand side runs once, and the number and nesting of names must match the tuple. `_` can stand in for an element you do not need. Later, functions and async operations will use tuples to return several results together.

## Exercise

Change quantity to `let` in the first program and inspect the `CV-ACCESS-IMMUTABLE` diagnostic, then restore `var`. Next, change `small` to 246 in the wrapping example and predict the output before running it.
