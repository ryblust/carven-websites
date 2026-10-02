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

Every ordinary named-function parameter needs a type. Named parameters must have unique names; `_` discards a parameter name, can repeat, and creates no binding. Argument count, access markers, and types must match. Functions do not overload. There are no default parameters, variadic parameters, nested functions, or user generic parameter lists. Definitions use a block body or `=> expression;`. The expression body is the usual form for a function whose work is one expression; a block body returns only through explicit `return`.

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

The explicit `i64` supplies context to both literals here. Specify a result type when C++ must judge external result compatibility. Distinct Carven identities of native expressions do not merge automatically.

An expression body is equivalent to returning that expression, with the same evaluation, access, lifetime, and failure-consumption rules. Its result is inferred from the expression when omitted; the expression may be a value `if`, `match`, or `try`, or a [contextual construction](/reference/aggregates/#contextual-construction) when the result type is written. A void expression can be an expression body or appear as `return action();`. A fallible expression requires explicit ?, as in `return action()?;`.

## Recursion and declaration order

Function identities and headers are collected first, permitting forward references. Functions requiring result inference complete according to dependencies. A result-inference cycle produces `CV-TYPE-RESULT-INFERENCE-CYCLE`; break it with explicit `-> T`. Caller context, operator requirements, or constant branches cannot guess results inside a cycle.

```carven
private fn even(value: i32) -> bool => if value == 0 { true } else { odd(value - 1) };

private fn odd(value: i32) -> bool => if value == 0 { false } else { even(value - 1) };
```

Removing both `-> bool` annotations makes each result depend on the other and reports `CV-TYPE-RESULT-INFERENCE-CYCLE`.

Recursive failure-set inference is independent of result-type inference. An explicit result does not imply an explicit failure set, or vice versa. A boundary declaration without a body defaults to void when its result is omitted.

## Compile-time capability

`const fn` declares that a named Carven function may run in required constant contexts: constant initializers, array extents, constant blocks, and `const test`. Those contexts call only `const fn`; `const eight = double(4);` with an ordinary `fn double` reports `CV-CONST-ADMISSION`. A `const fn` still runs as an ordinary call at runtime, and declaring it executes nothing.

```carven
const fn double(value: i32) -> i32 => value * 2;

const fn quadruple(value: i32) -> i32 => double(double(value));

const sixteen = quadruple(4);
println(sixteen, quadruple(5)); // 16 20
```

Every `const fn` definition is checked for executor capability, even when it is never called. Reachable calls, including calls through local bindings of a named `const fn`, must select a known `const fn`. Calling an ordinary `fn`, a native C++ operation, or a callable parameter reports `CV-CONST-ADMISSION` at the definition. Code after an unconditional return or excluded by constant facts is still type-checked but needs no capability. Entries, `import(cpp)` functions, and class operations cannot be `const fn`. The supported operation set and budgets are in [Constant evaluation](/reference/constants/#const-fn).

## Failure contracts of entries

Private non-entry functions and lambdas without a `throw` clause infer their failure set. Top-level statements form an implicit entry that infers outward failures the same way; an escaping failure ends the process with `EXIT_FAILURE` and no automatic output.

```carven
struct Missing {}

fn find(key: str) -> i32 throw Missing {
    if key == "answer" {
        return 42;
    }
    throw Missing {};
}

println(find("answer")?);
println(find("other")?);
println("unreachable");
```

This prints `42` and exits with a failure status. An explicit `fn main()` or a published function with outward failures must write a `throw` clause; omitting it reports `CV-EFFECT-THROW-PUBLISHED`. See [failure contracts](/reference/failures/) for the full rules.
