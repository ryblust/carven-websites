---
title: "Test success and failure paths"
description: "Make successful paths, boundaries, and failure recovery repeatable."
section: learn
lesson: 12
source: docs/language/execution.md
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

Tests can share a module with functions. A name is optional: the second test is anonymous, and a report identifies it by file, line, and column. Use a name to describe a business scenario; a short local invariant can use an anonymous test. Explicit names must be unique within a module. Run the tests directly:

```sh
carven interpret --tests totals.cv
```

The command runs the tests in the interpreter without invoking C++. It prints a summary on `stderr`:

```text
carven: tests: 2 passed; 0 failed
```

Passing tests return zero; failures return nonzero. Test mode skips main and top-level program statements, so the application entry can stay in the same file as the functions under test.

To check without executing ordinary tests, use `carven check totals.cv`; `const test` still executes during checking.

See the [CLI reference](/reference/cli/) to integrate generated tests into an existing C++ test runner.

## Run native project tests

In a native project, keep the test blocks beside the functions they verify and include those business files in the ordinary application's `sources`. Run `carven test` from the directory containing `build.cv`. The builder generates a test entry from those source roots and skips the application entry.

[Build and test with Carven](/learn/build/) gives the complete three-file project and plan. Native tests use the local C++ toolchain. The same application target supplies the inputs for both `carven run` and `carven test`.

For a standalone file, `carven interpret --tests file.cv` runs its tests directly without native compilation. Both forms skip the application entry; `const test` still executes during analysis.

## `check`, `require`, and `fail`

A failed `check` reports and continues, suitable for independent assertions. A failed `require` stops the whole current test, suitable for a prerequisite of later code. `fail` always stops the current test. Messages are `str` or `String`; conditions must be `bool`.

A `check` or `require` message is evaluated only when the condition is false. A message such as `f"quantity {quantity} gives no total"` is not constructed on success. `fail` always evaluates its message. Test stopping propagates through Carven helpers and views, including awaited helpers in asynchronous tests, and cleans up locals. `try` cannot catch a test stop.

Temporarily change 36 in the first assertion to 35, then run `carven interpret --tests totals.cv`. The report goes to `stderr`:

```text
totals.cv:4:5: error: check failed
  test:
    module: totals
    name: line total
  condition: total(12, 3) == 35
  operands:
    total(12, 3): 36

carven: tests: 1 passed; 1 failed
```

The first line locates the failed `check`. `test` identifies its module and name, `condition` shows the source condition, and `operands` shows the compared values. Restore 36 before continuing.

Explanations do not reevaluate operands; a side skipped by `&&` or `||` appears as `<not evaluated>`. See the [test-report reference](/reference/entry-testing/) for the remaining fields and value display rules.

## Guard a dependent operation

Before reading the first element, use `require` to establish that the collection is nonempty. Save this separate file as `prerequisite.cv`:

```carven
test "first sample" {
    let samples: Vector<i32> = [];
    require(!samples.is_empty(), "need at least one sample");

    check(samples[0] == 7);
    println("sample checked");
}

test "next case" {
    println("next test");
}
```

Run `carven interpret --tests prerequisite.cv`. `stdout` prints only `next test`. `stderr` reports `requirement failed`, the message `need at least one sample`, and `note: test stopped`, followed by `carven: tests: 1 passed; 1 failed`. The exit status is 1. The index access and `sample checked` are skipped, while the next test still runs.

Change the empty collection to `[7]` and run again. `stdout` prints `sample checked` and `next test`, and both tests pass. Using `check` in place of `require` would continue into the empty index access and terminate execution; this prerequisite needs to stop the current test.

## Assert program invariants

`check` and `require` belong to tests. Use `assert` for a condition that must hold wherever the code runs. Save stock.cv:

```carven
fn remaining(stock: i32, sold: i32) -> i32 {
    assert(sold <= stock, f"sold {sold} of {stock}");
    return stock - sold;
}

println(remaining(5, 2));
println(remaining(2, 5));
println("not reached");
```

`carven run stock.cv` prints `3` on `stdout`, then reports on `stderr`:

```text
stock.cv:2:5: error: assertion failed
  condition: sold <= stock
  operands:
    sold: 5
    stock: 2
  message: sold 5 of 2
  note: execution aborted
```

The native process aborts without ordinary stack cleanup, so `not reached` never prints and the exit status is nonzero. `assert` is always enabled, and its message is evaluated only on failure. An assertion is not a typed failure: `try` cannot catch it.

See [entry and testing reference](/reference/entry-testing/) for evaluation order and the complete report fields.

## Test recoverable failures

Append this to totals.cv, then run `carven interpret --tests totals.cv` again:

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

The summary becomes `carven: tests: 3 passed; 0 failed`. The new test checks the recovery arm and rejected value. Tests must handle every declared failure, including in successful-input cases.

## Check products and collection boundaries

Tests can compare tuple results directly when their elements support equality. Save this independent test file as batches.cv:

```carven
fn bounds(values: [i32]) -> (i32, i32) {
    assert(!values.is_empty(), "bounds needs at least one sample");
    var (lower, upper) = (values[0], values[0]);
    for value in values {
        if value < lower => lower = value;
        if value > upper => upper = value;
    }
    return (lower, upper);
}

test "mixed signs" {
    check(bounds([7, -2, 4]) == (-2, 7));
}

test "growing runtime batch" {
    var values: Vector<i32> = [7];
    values.push(-2);
    values.push(4);

    check(bounds(values) == (-2, 7));

    let removed = values.remove(1);
    check(removed == -2);
    check(bounds(values) == (4, 7));
}
```

`carven check batches.cv` checks the source without running the tests. `carven interpret --tests batches.cv` runs both tests. To test the native implementation, include `batches.cv` in the application target's `sources` and run `carven test`. The cases exercise mixed signs, growth, removal order, and recalculated bounds. An empty input violates the explicit invariant and aborts; do not call it from a test that expects typed recovery. We introduce static execution in the next chapter.

## Exercise

Add an anonymous success test for `positive` with input 3, then change the input to -1 and read the report. Compare whether a `println` after `check(false)` and `require(false)` executes. Change stock.cv so the second call is `remaining(2, 2)` and confirm all three lines print. These are runtime tests; algorithms declared `const fn` can additionally use `const test` with supported static operations.
