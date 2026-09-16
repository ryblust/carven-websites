---
title: "Functions, result inference, and calls"
description: "Signatures, expression bodies, recursive result dependencies, void, and call order."
section: reference
lesson: 6
source: docs/semantics.md
---

## Declarations and calls

```carven
fn add(left: i32, right: i32) -> i32 {
    return left + right;
}

fn twice(value: i32) => value * 2;
```

Every ordinary named-function parameter needs a type. Named parameters must have unique names; `_` discards a parameter name, can repeat, and creates no binding. Argument count, access markers, and types must match. Functions do not overload. There are no default parameters, variadic parameters, nested functions, or user generic parameter lists. Definitions use a block body or `=> expression;`.

Evaluate the callee first, then arguments once each from left to right. A concrete closure selects object identity; a view saves its target description. After arguments complete, invoke the target and read current captures. Side effects in arguments may change aliased storage read later.

## Result inference

A function with a body may omit its result annotation. Each return operand is typed independently and the results must agree. Caller expectations do not affect the callee's result inference, nor does an earlier return supply context to a later one. A return operand that cannot complete normally contributes no result type.

No return operand means inferred void; bare `return;` also requires void. Every normal path in a value-returning function must return. An ordinary final expression in a block is not an implicit function return.

```carven
fn number(flag: bool) -> i64 {
    if flag {
        return 1;
    }

    return 2;
}
```

The explicit i64 supplies context to both literals here. Specify a result type when C++ must judge external result compatibility. Distinct Carven identities of native expressions do not merge automatically.

An expression body is equivalent to returning that expression, with the same access, lifetime, and failure-consumption rules. A void expression can be an expression body or appear as `return action();`. A fallible expression requires explicit ?, as in `return action()?;`.

## Recursion and declaration order

Function identities and headers are collected first, permitting forward references. Functions requiring result inference complete according to dependencies. A result-inference cycle produces `CV-TYPE-RESULT-INFERENCE-CYCLE`; break it with explicit `-> T`. Caller context, operator requirements, or constant branches cannot guess results inside a cycle.

```carven
private fn even(value: i32) -> bool {
    if value == 0 {
        return true;
    }

    return odd(value - 1);
}

private fn odd(value: i32) -> bool {
    if value == 0 {
        return false;
    }

    return even(value - 1);
}
```

Recursive failure-set inference is independent of result-type inference. An explicit result does not imply an explicit failure set, or vice versa. A boundary declaration without a body defaults to void when its result is omitted.
