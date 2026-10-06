---
title: Variable declarations and scope
description: Declaration forms, initialization, type inference, assignment, and scope for let, var, and const.
section: reference
lesson: 4
source: docs/language/ownership.md
---

## Declaration forms

Use `let` for a runtime variable that cannot be reassigned, `var` for a mutable runtime variable, and `const` for a compile-time constant. Each declaration requires an initializer and ends with a semicolon. The type annotation is optional.

```text
let name[: Type] = expression;
var name[: Type] = expression;
const name[: Type] = expression;
```

```carven
let price = 12;
var quantity: i32 = 2;
const limit = 10;
quantity += 1;
println(price * quantity, limit); // 36 10
```

| Declaration | Initialization | Reassignable | Typical use                                     |
| ----------- | -------------- | ------------ | ----------------------------------------------- |
| `let`       | Runtime        | No           | Intermediate results and unchanged local values |
| `var`       | Runtime        | Yes          | Accumulators, loop state, and mutable data      |
| `const`     | Compilation    | No           | Fixed data, array extents, and static arguments |

Prefer `let`. Use `var` when you need to change the binding, its fields, or its array elements. Use `const` when a compile-time value is required. A runtime `let` initialized by a literal cannot substitute for a `const` required by a static parameter.

## let and var

`let` and `var` create local bindings that own their values. `var` permits assignment, compound assignment, and mutation through Write parameters; `let` does not grant those permissions. Pointer-target access still follows the target permissions in the pointer type.

```carven
fn increment(&value: i32) {
    value += 1;
}

var total = 0;
increment(&total);
total = total + 2;
println(total); // 3
```

The argument's `&` must match the declared Write parameter. See [access and ownership](/reference/ownership/) for copying, transfer, and borrowing.

The following examples are rejected independently:

```carven
let count = 1;
count = 2; // Compile error: a let binding cannot be reassigned.
```

```carven
var count: i32; // Compile error: an initializer is required.
```

## const

A `const` initializer must execute at compilation. Any Carven function it calls must be declared `const fn`. Type checking, executor admission, and execution budgets apply to the initializer.

```carven
const fn twice(value: i32) -> i32 => value * 2;

const capacity = twice(3);
let values: [i32; capacity] = [1, 2, 3, 4, 5, 6];
println(values.as_slice().len()); // 6
```

A module constant requires a name. See [constants](/reference/constants/) and [functions](/reference/functions/) for `const fn`, constant blocks, static parameters, `const if`, and `const for`.

## Type annotations and inference

A type annotation supplies an expected type to the initializer. Without it, the initializer determines the type: unsuffixed integers usually use `i32`, and unsuffixed floating literals usually use `f64`. Assignment and later use cannot change an established binding's type.

```carven
let small: u8 = 12;
let wide = 12i64;
var count = 1;
count = 2;
println(small, wide, count); // 12 12 2
```

An established `i64` value cannot be assigned directly to an `i32` variable. Use an admitted [`as` conversion](/reference/types/#as-conversions) when conversion is intended. An initializer cannot be omitted to request a default value; write `var count = i32 {};` or the corresponding `Type {}`.

## Scope and shadowing

A local name becomes visible only after its type and initializer have been checked. A same-named reference in the initializer selects an existing outer binding. Function bodies, branches, and loops establish their corresponding local scopes.

```carven
let value = 4;
if true {
    let value = value + 1;
    println(value); // 5
}
println(value); // 4
```

Top-level `let` and `var` bindings are locals of the implicit program entry; module functions cannot capture them. A top-level `const` is a module constant that functions can reference. See [modules](/reference/modules/) for module lookup and visibility.

## Discard binding `_`

`_` discards the name, creates no referenceable variable, and can repeat. `_name` is an ordinary name. A runtime discard still evaluates its initializer and keeps the produced value until the enclosing scope ends. A local `const _` still requires a constant initializer; a module constant cannot be named `_`.

```carven
let _ = 1 + 2;
let _ = 3 + 4;
let _answer = 42;
println(_answer); // 42
```

## Related entries

[Types and conversions](/reference/types/) · [Operators and expressions](/reference/operators/) · [Access and ownership](/reference/ownership/) · [Keyword index](/reference/keywords/)
