---
title: "Test success and failure paths"
description: "Make successful paths, boundaries, and failure recovery repeatable."
section: learn
lesson: 11
source: docs/semantics.md
---

## Write a runtime test

Save totals.cv:

```carven
fn total(price: i32, count: i32) -> i32 => price * count;

test "line total" {
    check(total(12, 3) == 36);
    check(total(12, 0) == 0, "zero quantity");
}

test {
    check(total(0, 5) == 0);
}
```

Tests can share a module with functions. A name is optional: the second test is anonymous, and a report identifies it by file, line, and column. Explicit names must be unique within a module. Run the tests directly:

```sh
carven --tests totals.cv
```

The command generates C++, compiles it, and runs the tests, so it needs an available native C++ toolchain. It prints a summary on stderr:

```text
carven: tests: 2 passed; 0 failed
```

Passing tests return zero; failures return nonzero. Test mode skips main and top-level program statements, so the application entry can stay in the same file as the functions under test.

This example also fits the interpreter subset. Run the same tests without invoking a C++ compiler:

```sh
carven interpret --tests totals.cv
```

The interpreter prints the same summary. Each test gets independent storage and an execution budget. Tests that reach native C++ operations need native mode. To check without executing ordinary tests, use `carven check totals.cv`; const test still executes during checking.

To integrate tests into your own C++ build, use `carven compile --tests -o generated totals.cv` for a default test entry, or `--tests=external` for your own entry and reporter. See [CLI Reference](/reference/cli/) for source collection and entry selection.

## check, require, and fail

A failed check reports and continues, suitable for independent assertions. A failed require stops the whole current test, suitable for a prerequisite of later code. fail always stops the current test. Messages are str or String; conditions must be bool.

A check or require message is evaluated only when the condition is false, so it can build a detailed description such as `f"quantity {quantity} gives no total"` without cost on success. fail always evaluates its message. Test stopping propagates through synchronous Carven helpers and views, cleaning up locals. try cannot catch a test stop.

Temporarily change 36 in the first assertion to 35, then run `carven --tests totals.cv`. The report goes to stderr:

```text
totals.cv:4:5: error: check failed
  test:
    module: totals
    name: line total
  condition: total(12, 3) == 35
  operands:
    total(12, 3): 36
    35: 35

carven: tests: 1 passed; 1 failed
```

The first line gives the source location of the failed check. `test` names the module and test; an anonymous test shows its location instead, such as `name: totals.cv:8:1`. `condition` is the source text, and `operands` shows both sides of the outer comparison with their values. A `message:` line follows when a failed operation has a message; a failed require adds `note: test stopped`. `interpret --tests` prints the same layout. Restore 36 before continuing.

Explanations do not reevaluate operands; a side skipped by `&&` or `||` appears as `<not evaluated>`. Struct values compare field by field and appear structurally in operands. Classes have no implicit equality: comparing two class values with `==` reports `CV-TYPE-EQUALITY-UNSUPPORTED`, so compare values returned by their operations instead.

## Assert program invariants

check and require belong to tests. Use assert for a condition that must hold wherever the code runs. Save stock.cv:

```carven
fn remaining(stock: i32, sold: i32) -> i32 {
    assert(sold <= stock, f"sold {sold} of {stock}");
    return stock - sold;
}

println(remaining(5, 2));
println(remaining(2, 5));
println("not reached");
```

`carven stock.cv` prints `3` on stdout, then reports on stderr:

```text
stock.cv:2:5: error: assertion failed
  condition: sold <= stock
  operands:
    sold: 5
    stock: 2
  message: sold 5 of 2
  note: execution aborted
```

The native process aborts without ordinary stack cleanup, so `not reached` never prints and the exit status is nonzero. assert is always enabled, independently of build configuration and `NDEBUG`, and needs no test context. Its message is evaluated only on failure. An assertion is not a typed failure: try cannot catch it. Under `carven interpret`, a failed assertion stops the whole execution; during compile-time execution it produces `CV-ASSERT`. When an assertion fails inside a test, the report adds the `test:` context and the run aborts without a summary.

See [entry and testing Reference](/reference/entry-testing/) for evaluation order and the complete report fields.

## Test recoverable failures

Append this to totals.cv, then run `carven --tests totals.cv` again:

```carven
struct Invalid {
    value: i32,
}

fn positive(value: i32) -> i32 throw Invalid {
    if value <= 0 {
        throw Invalid { value };
    }

    return value;
}

test "reject zero" {
    let rejected = try {
        positive(0)?;
        -1
    } catch {
        Invalid(error) => error.value,
    };

    check(rejected == 0);
}
```

The summary becomes `carven: tests: 3 passed; 0 failed`. test permits no residual escaping failure. This example checks that a failure occurred, that the recovery arm was selected, and that the payload carries the rejected value. A successful-input test must still handle failures declared by the contract, rather than assume the current input cannot fail.

## Read a diagnostic

Start with the original .cv location, then read the diagnostic code and explanation. Types, ownership, failure sets, C++ compilation, and linking are distinct boundaries. Native construction or provider errors may still occur after Carven analysis succeeds. On a terminal, Carven colors its diagnostics; set `NO_COLOR` to disable this.

Use `_` for an intentionally unused value. Warnings do not fail an otherwise valid program. For native errors, inspect includes, provider signatures, and construction requirements.

## Exercise

Add an anonymous success test for positive with input 3, then change the input to -1 and read the report. Compare whether a println after check(false) and require(false) executes. Change stock.cv so the second call is `remaining(2, 2)` and confirm all three lines print. These are runtime tests; pure compile-time algorithms can additionally use const test.
