---
title: "Run, format, and diagnose"
description: "Choose commands for running, formatting, testing, and finding the cause of an error."
section: learn
lesson: 20
source: docs/toolchain/cli.md
---

## Choose the command for the task

| Task                           | Command                                                  |
| ------------------------------ | -------------------------------------------------------- |
| Semantic checking              | `carven check main.cv`                                   |
| Native project tests           | `carven test`                                            |
| Interpreted tests              | `carven interpret --tests main.cv`                       |
| Stage timings                  | `carven check --timings main.cv`                         |
| Native execution               | `carven run main.cv`                                     |
| Generate files only            | `carven compile -o generated main.cv`                    |
| Inspect generated output       | `carven compile --stdout main.cv`                        |
| Interpret the supported subset | `carven interpret main.cv`                               |
| Trace interpretation           | `carven interpret --trace main.cv`                       |
| Limit interpreter steps        | `carven interpret --max-steps 10000 main.cv`             |
| Inspect tokens or syntax       | `carven dump tokens main.cv` / `carven dump ast main.cv` |

Use `interpret` to run supported Carven code without compiling C++. For its execution limits and native-call behavior, see the [CLI reference](/reference/cli/).

To follow execution, save the [interval classification example](/learn/control/#choose-a-result-by-interval) as main.cv. Run `carven interpret main.cv` to print `pass`. Add --trace to see each executed statement. Use native execution when exploring the full language or integrating C++ libraries.

See the [CLI reference](/reference/cli/) for source collection, toolchain selection, and installation layout. Imports select source dependencies from explicit roots, as in the [module lesson](/learn/modules/). Project commands use the current directory's build.cv, introduced in [Build a project with Carven](/learn/build/).

## Check before running

Start with check when you want type, borrowing, and compile-time checks without building a program. Save this as `prices.cv`:

```carven
const fn line_total(price: i32, quantity: i32) -> i32 => price * quantity;

const test {
    check(line_total(12, 3) == 36);
}
```

Run:

```sh
carven check prices.cv
```

The command executes the static test and returns status 0 when it passes. No program entry is needed for check. Change 36 to 35 and check again: the test fails with `CV-CONST-TEST`, displays the condition and computed result, and check returns 1.

Named source functions called during compilation must be declared `const fn`. Remove `const` from `line_total` and check reports `CV-CONST-ADMISSION` at the call inside the test.

Add `--timings` to see where a command spends its time:

```sh
carven check --timings prices.cv
```

The `stderr` report shows total time, stage durations, and their shares of the total. It remains separate from program and artifact output on `stdout`. Color controls and the full stage list are in the [CLI reference](/reference/cli/).

## Format source with `carven format`

`carven format` runs the companion `carven-format` from the same toolchain directory. From your exercise directory, preview one file, check the directory, or update files:

```sh
carven format main.cv
carven format check .
carven format write .
```

The first run previews formatted source on `stdout`. `check` lists files needing changes and returns 1 when differences exist; `write` updates them in place. The [CLI reference](/reference/cli/) covers file selection, help, and exit codes.

Formatting changes layout; continue with semantic checking and tests afterward.

## Read the formatted source

Short import selections stay on one line, with spaces inside the braces and no trailing comma:

```carven
import std::utf using { from_utf8, to_string }
import <vector> using std::{ vector, allocator }
```

Longer selections expand to one name per line, including a comma after the last name. An existing trailing comma does not force a short list to expand; let `carven-format` choose the layout for the target width.

The formatter preserves expression-bodied functions and written import order.

## Separate static, runtime, and interop tests

Use `const test` for compile-time algorithms and `test` for runtime behavior; both may omit the name, and failures then identify the test by file, line, and column. Exercise native interop in a C++ build so the tests also cover linking, destruction, and exception boundaries.

## Locate the error boundary

1. Missing name: check the input batch, canonical module path, using, and visibility.
2. Type mismatch: check literal context, explicit as, exact parameter access, and success results.
3. Value unavailable: find where it was taken, then either stop using the old variable or assign a new value before using it.
4. Borrow conflict: find live `str`, slices, views, and holders of Write captures.
5. Unhandled failure: check which errors the called function can report, which ones catch handles, and which ones the caller still needs to declare.
6. Native error: check headers, C++ signatures, construction, and link inputs.

## Use the Reference

Use the [reference index](/reference/) to look up syntax and APIs, and the [diagnostic catalog](/reference/diagnostics/) to find a compiler code.
