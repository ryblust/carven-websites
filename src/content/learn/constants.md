---
title: "Compile-time computation and tests"
description: "Organize loops and text construction with const fn, and understand freezing and execution stages."
section: learn
lesson: 11
source: docs/semantics.md
---

## Prepare a static heading

```carven
const fn title(value: i32) -> String {
    println("Preparing title");
    return f"Build {value:04}";
}

const heading = title(42);

const test "heading" {
    check(heading == "Build 0042");
}

fn main() {
    println(heading);
}
```

With `carven main.cv`, the compilation stage prints Preparing title, then the launched program prints Build 0042. Running the generated executable on its own prints only Build 0042. heading's final type is str. String owns its contents during computation and freezes into static text when constant initialization finishes.

## const fn does not always run at compile time

In an ordinary runtime expression, `title(42)` remains an ordinary function call. A const fn declaration makes it eligible for required constant execution; const initializers, array lengths, const test, and similar contexts require that execution.

A const fn can use mutable locals, loops, supported arrays and structs, and String operations. An ordinary const initializer cannot directly contain arbitrary control-flow expressions. Put complex logic in a const fn.

## Static tables

```carven
const table: [i32] = [2, 4, 6];
const middle = table.slice(1usize, 3usize);

fn main() {
    println(middle.len(), middle[0]);
}
```

The output is `2 4`. This is a frozen slice with static backing, so it can be returned and retained. A view into a runtime local array does not have that lifetime. Slice operations inside const fn remain outside the supported subset; an array result can freeze at the constant-initialization boundary.

## Failures and budgets

const test always runs during semantic analysis without a test-artifact option. A failed check fails compilation but continues the current test. require/fail stop that test; later static tests still run. Ordinary test uses a runtime runner.

Constant execution supports a defined subset: no native calls, typed failures, floating-point computations, callables, or Write parameters. All branches undergo admission checks; `if false` cannot hide an unsupported operation. Integer overflow and exhausted budgets are diagnostics, without a runtime fallback.

## Exercise

Change the static assertion to an incorrect string and confirm that compilation fails. Restore it and run `compile --stdout`: compile-time output goes to stderr, leaving stdout for generated artifacts.
