---
title: "Test success and failure paths"
description: "Make successful paths, boundaries, and failure recovery repeatable."
section: learn
lesson: 11
source: docs/semantics.md
---

## Write a runtime test

Save totals.cv in the Carven repository root:

```carven
fn total(price: i32, count: i32) -> i32 => price * count;

test "line total" {
    check(total(12, 3) == 36);
    check(total(12, 0) == 0, "zero quantity");
}
```

Tests can share a module with functions. Run the test directly:

```sh
carven --tests totals.cv
```

The command generates C++, compiles it, and runs the tests, so it needs an available native C++ toolchain. From a compiler source checkout, use `./xmakew run carven --tests totals.cv`. Passing tests return zero; failures return nonzero. Test mode skips main and top-level program statements, so the application entry can stay in the same file as the functions under test.

This example also fits the interpreter subset. Run the same tests without invoking a C++ compiler:

```sh
carven interpret --tests totals.cv
```

In interpreted mode, each test gets independent storage and an execution budget. Use native mode for tests involving native operations, Write parameters, or callables. To check without executing ordinary tests, use `carven check totals.cv`; const test still executes during checking.

To integrate tests into your own C++ build, use `carven compile --tests -o generated totals.cv` for a default test entry, or `--tests=external` for your own entry and reporter. See [CLI Reference](/reference/cli/) for source collection and entry selection.

## check, require, and fail

A failed check reports and continues, suitable for independent assertions. A failed require stops the whole current test, suitable for a prerequisite of later code. fail always stops the current test. Messages are str or String; conditions must be bool.

Messages are evaluated eagerly, even when a condition succeeds. Do not put effects in a message that should only happen on failure. Test stopping propagates through synchronous Carven helpers and views, cleaning up locals. try cannot catch a test stop.

Temporarily change 36 in the first assertion to 35, then run the test. A failed direct comparison reports both operand expressions and their values, showing that `total(12, 3)` produced 36. Restore 36 before continuing. Explanations do not reevaluate operands; a side skipped by `&&` or `||` appears as `<not evaluated>`.

## Test recoverable failures

Append this to totals.cv, then run `carven --tests totals.cv` again:

```carven
struct Invalid {}

fn positive(value: i32) -> i32 throw Invalid {
    if value <= 0 {
        throw Invalid {};
    }

    return value;
}

test "reject zero" {
    let rejected = try {
        positive(0)?;
        false
    } catch {
        Invalid(_) => true,
    };

    check(rejected);
}
```

test permits no residual escaping failure. This example checks both that a failure occurred and that the recovery arm was selected. A successful-input test must still handle failures declared by the contract, rather than assume the current input cannot fail.

## Read a diagnostic

Start with the original .cv location, then read the diagnostic code and explanation. Types, ownership, failure sets, C++ compilation, and linking are distinct boundaries. Native construction or provider errors may still occur after Carven analysis succeeds.

Use `_` for an intentionally unused value. Warnings do not fail an otherwise valid program. For native errors, inspect includes, provider signatures, and construction requirements.

## Exercise

Add a success test for positive with input 3, then change the input to -1. Compare whether a println after check(false) and require(false) executes. These are runtime tests; pure compile-time algorithms can additionally use const test.
