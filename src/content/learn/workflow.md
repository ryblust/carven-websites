---
title: "Run, format, and diagnose"
description: "Select execution stages, organize validation, and locate problems at their boundaries."
section: learn
lesson: 16
source: docs/toolchain/cli.md
---

## Choose the command for the task

| Task                           | Command                                                  |
| ------------------------------ | -------------------------------------------------------- |
| Semantic checking              | `carven check main.cv`                                   |
| Native tests                   | `carven --tests main.cv`                                 |
| Interpreted tests              | `carven interpret --tests main.cv`                       |
| Stage timings                  | `carven check --timings main.cv`                         |
| Native execution               | `carven main.cv`                                         |
| Generate files only            | `carven compile -o generated main.cv`                    |
| Inspect generated output       | `carven compile --stdout main.cv`                        |
| Interpret the supported subset | `carven interpret main.cv`                               |
| Trace interpretation           | `carven interpret --trace main.cv`                       |
| Limit interpreter steps        | `carven interpret --max-steps 10000 main.cv`             |
| Inspect tokens or syntax       | `carven dump tokens main.cv` / `carven dump ast main.cv` |

The interpreter first performs the same semantic analysis, then checks each operation when execution reaches it. An unsupported operation produces `CV-INTERPRET-ADMISSION` without switching to native execution. Typed failures, slices, byte views, local pointers, Write parameters, and calls through local bindings of named functions use this shared executor. C++ header imports are accepted, but reaching a native operation, closure, or other callable value without a Carven body stops interpretation. Use the native path for those programs.

To observe execution step by step, run the [integer classification example](/learn/control/) with `carven interpret main.cv`, then add `--trace` to see the statements it executes. Use native execution when exploring the full language or integrating C++ libraries.

Direct execution needs a native C++ toolchain and matching Crafts, but does not require Xmake. `check`, `compile`, `interpret`, and direct execution all collect the toolchain's `crafts/carven/` and the project's optional `crafts/`; other application files remain explicit, and their file stems must be valid identifiers. See [CLI Reference](/reference/cli/) for installation layout, temporary files, and toolchain selection.

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

The command prints `carven: check passed` on stderr. The file has no program entry, and check does not need one: it analyzes the batch, runs required compile-time evaluation and `const test`, then stops without invoking the native compiler. `carven prices.cv` would instead report that running a program requires a runtime entry point. Change 36 to 35 and check again: the static test fails with `CV-CONST-TEST`, showing the condition and the computed call result, and check returns 1.

Compile-time calls must select a `const fn`. Remove `const` from line_total and check reports `CV-CONST-ADMISSION` at the call inside the test.

Add `--timings` to see where a command spends its time:

```sh
carven check --timings prices.cv
```

The stderr report shows total time and a table of stage durations and their shares of that total, such as source collection, parsing, and semantic analysis. Native runs add C++ generation, native compilation, and execution. Timing output never mixes with program or artifact output on stdout. Rendered diagnostics use color on a terminal; set `NO_COLOR` to a nonempty value, or `TERM=dumb`, to disable it. Use `carven dump main.cv` to view tokens followed by the syntax tree for one file.

## Format source with Graver

Graver is a separate formatter for `.cv` source. Build it from the Carven repository root, then preview one file, check a directory, or update files:

```sh
./xmakew build graver
./xmakew run graver main.cv
./xmakew run graver check examples
./xmakew run graver write examples
```

The first run prints formatted source to stdout without changing the file. `check` lists paths needing changes and returns 1 when differences exist, making it suitable for CI. `write` updates changed files in place. On Windows, use `.\xmakew.ps1`. When calling the built executable directly, replace `./xmakew run graver` with `graver`.

Graver uses a fixed style with four-space indentation and a target width of 100 bytes. It checks lexical and syntactic validity without resolving imports, checking types, or executing `const fn` or `const test`. Continue to build and test after formatting. See the [command-line Reference](/reference/cli/#graver) for commands and file selection.

## Read the formatted source

Short import selections stay on one line, with spaces inside the braces and no trailing comma:

```carven
import std::utf.text using { from_utf8, to_string };
import <vector> using std::{ vector, allocator };
```

Longer selections expand to one name per line, including a comma after the last name. An existing trailing comma does not force a short list to expand; let Graver choose the layout for the target width.

Function and closure block bodies expand by default; expression-bodied functions keep `=>`. Simple blocks in an if-chain or match/catch arm list may stay on one line. A complex or multiline branch, a comment, or an authored blank line expands all nonempty block bodies in that group. Loops, tests, and match/catch lists stay multiline.

Adjacent top-level single-line declarations of the same category can stay together. Different categories or multiline declarations get a separating blank line. Existing authored blank-line counts remain. Formatting makes structure easier to read without rewriting function body forms or replacing semantic checks.

## Put tests at the appropriate layer

Use `const test` for compile-time algorithms and test for runtime behavior; both may omit the name, and failures then identify the test by file, line, and column. Exercise native interop in a C++ build so the tests also cover linking, destruction, and exception boundaries.

The Carven repository uses ./xmakew with groups including internal, language, crafts, interop, cli, and examples. Consumer projects use their own Xmake targets, not compiler-internal test targets as application APIs.

## Locate the error boundary

1. Missing name: check the input batch, canonical module path, using, and visibility.
2. Type mismatch: check literal context, explicit as, exact parameter access, and success results.
3. Unavailable owner: find the earlier Take and check restoration on every normally continuing path.
4. Borrow conflict: find live `str`, slices, views, and holders of Write captures.
5. Unhandled failure: inspect the call contract, ?, handler residual set, and outer contract.
6. Native error: check headers, C++ signatures, construction, and link inputs.

## Use the Reference

Choose a topic and check its supported forms, preconditions, evaluation order, and boundary behavior. Tutorial examples build a mental model. Before changing an interface, verify returned borrows, failure sets, ownership transfer, and native provider obligations. Keep observable business requirements in tests.
