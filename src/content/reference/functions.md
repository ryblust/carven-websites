---
title: "Functions: fn, parameters, and results"
description: "Function syntax, calls, expression and block bodies, result types, and static parameters."
section: reference
lesson: 8
source: docs/language/functions.md
---

Use `fn` to declare a named function. Write parameter types, call it with `name(arguments)`, and use `=>` when its result is one expression. Use a block body for statements, updates, or multiple return paths.

## Syntax at a glance

| Form                                                    | Purpose                                              |
| ------------------------------------------------------- | ---------------------------------------------------- |
| `fn name(arg: T) -> R => expression;`                   | Expression body with a declared result type          |
| `fn name(arg: T) => expression;`                        | Expression body with an inferred result type         |
| `fn name(arg: T) -> R { return expression; }`           | Block body with an explicit return                   |
| `fn name(arg: T) { statements }`                        | Block body with an inferred result, including `void` |
| `const fn name(arg: T) -> R => expression;`             | Function admitted in required constant contexts      |
| `fn name(arg: T, const setting: S) -> R => expression;` | Function specialized for a static input              |
| `fn name(arg: T) -> R throw E { statements }`           | Function with a declared outward failure set         |

`T`, `R`, `S`, `E`, `expression`, and `statements` are placeholders. Parameter access markers are described in [access and ownership](/reference/ownership/); anonymous functions and `fn(...) -> R` views are described in [closures](/reference/closures/).

## Declarations and calls

```carven
fn add(left: i32, right: i32) -> i32 => left + right;

fn twice(value: i32) => value * 2;

let total = add(2, 3);
println(total, twice(total)); // 5 10
```

Here `add` declares an `i32` result and `twice` infers the same type from its expression. The calls supply arguments in the parameter order.

Every ordinary named-function parameter needs a type. Named parameters must have unique names; `_` discards a parameter name, can repeat, and creates no binding. Argument count, access markers, and types must match. Functions do not overload. There are no default parameters, variadic parameters, nested functions, or user generic parameter lists. Definitions use a block body or `=> expression;`. The expression body is the usual form for a function whose work is one expression; a block body returns only through explicit `return`.

Runtime calls evaluate the callee first, then runtime arguments once each from left to right. Static inputs execute separately under the [static parameter rules](#static-parameters). A concrete closure selects object identity; a view saves its target description. After arguments complete, invoke the target and read current captures. Side effects in arguments may change aliased storage read later.

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

Every const fn definition is checked for executor capability, even if never called. Reachable calls, including through local bindings of a named const fn, must select a known const fn. Ordinary functions, native operations and callable parameters report `CV-CONST-ADMISSION` at the definition. Code after an unconditional return remains type-checked but needs no capability; known conditions do not prune ordinary branch analysis. Entries, import(cpp) declarations and class operations cannot be const fn. See [constant execution](/reference/constants/#const-fn) for operations and budgets.

## Static parameters

A named function parameter may specify a static input with `const name: T`. Calls retain ordinary argument syntax and full source arity: `fn add(value: i32, const offset: i32) -> i32 => value + offset;` is called as `add(value, 2)`. The input is an immutable value with no source-addressable storage; it cannot combine const with Write or Take.

Literals, explicit constants, enclosing static parameters, admitted operations on those values, and `const fn` results can supply static inputs. Ordinary runtime let/var bindings, parameters, and for indices cannot, even when their values are known. A forwarding wrapper must repeat the `const` parameter contract. Inside `const` blocks and `const test`, all local values belong to the static stage and can supply these inputs.

`const fn` permits executing a function at compilation; a `const` parameter fixes one input at compilation. An ordinary function may have static parameters and execute its remaining body at runtime. Declaring both does not move an ordinary call or its runtime arguments to compilation.

Static argument expressions evaluate and freeze in source order during specialization. The residual runtime call then evaluates its callee and runtime arguments in source order. A `const fn` uses these same stages even when called by a static root. Inside a const block or const test, arguments instead execute together in source order and select the instance from their resulting static values.

An instance is selected by the source function and typed static values. Equal inputs may share the instance, but each static argument expression retains its own execution. Generated C++ signatures contain only runtime parameters. Functions with static parameters require direct calls; they cannot cross import(cpp)/export(cpp) boundaries or form callable values. Lambdas and callable-view types do not accept const parameters.

## Static control

In a runtime body, ordinary if, logical operators, and for retain runtime semantics. Their operand values do not select analysis or static execution: each static initializer and static call argument inside ordinary control is required for the instance containing it. Inside a const block or const test, ordinary control executes at compilation and selects statements to execute, while every source arm still receives type and contract checks.

`const if` selects one arm per instance, and every condition in the chain, including else if, must be static. All arms receive name, type, failure-contract, ownership, and return analysis: the function has one contract across its instances. Only the selected arm is specialized and generated. Local initializer roots and static arguments in other arms do not execute during specialization.

```carven
fn scale(value: i32, const divisor: i32) -> i32 {
    const if divisor == 0 {
        return 0;
    } else {
        const factor = 100 / divisor;
        return value * factor;
    }
}

fn sum(value: i32, const count: i32) -> i32 {
    var total = 0;
    const for index in 0..count {
        total += scale(value, index);
    }
    return total;
}

println(scale(2, 0), scale(2, 4), sum(2, 3)); // 0 50 300
```

`scale(2, 0)` never evaluates `100 / divisor`. Type formation still computes constant array extents in every arm before specialization, without executing their declarations. Such computation writes no output, reports failures even in unselected arms, and requires independence from unbound static parameters. Body-local const blocks execute in the enclosing static environment; see [constant blocks](/reference/constants/#constant-blocks).

`const for` expands a Read integer range with static bounds. Each index is a static binding with its own iteration scope; outer variables remain shared. `const alias = index` preserves static qualification in a runtime body; `let alias = index` does not. Break, continue, return, and failure propagation keep their ordinary meaning. Reversed or empty ranges expand no iterations. Cumulative iteration, instance, and nesting limits produce diagnostics, with no runtime fallback. Unselected arms, iterations after static break, and source after static exit remain checked but are omitted from specialization.

## Failure contracts of entries

Private non-entry functions and lambdas without a `throw` clause infer their failure set. Top-level statements form an implicit entry that infers outward failures the same way; an escaping failure ends the process with `EXIT_FAILURE` and a structural failure report on stderr.

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
