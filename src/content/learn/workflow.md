---
title: "Run, format, and diagnose"
description: "Select execution stages, organize validation, and locate problems at their boundaries."
section: learn
lesson: 16
source: docs/cli.md
---

## Choose the command for the task

| Task                           | Command                                                  |
| ------------------------------ | -------------------------------------------------------- |
| Native execution               | `carven main.cv`                                         |
| Generate files only            | `carven compile -o generated main.cv`                    |
| Inspect generated output       | `carven compile --stdout main.cv`                        |
| Interpret the supported subset | `carven interpret main.cv`                               |
| Trace interpretation           | `carven interpret --trace main.cv`                       |
| Limit interpreter steps        | `carven interpret --max-steps 10000 main.cv`             |
| Inspect tokens or syntax       | `carven dump tokens main.cv` / `carven dump ast main.cv` |

The interpreter first performs the same semantic analysis, then checks execution eligibility of called code. Unsupported operations produce an error without switching to native execution. Use the native path for typed failures, closures, slices, and native operations.

Interpretation is an experimental subset for demonstrations and teaching. Run the [integer classification example](/learn/control/) with `carven interpret main.cv`, then add `--trace` to observe execution. Use native execution when exploring the full language or integrating C++ libraries.

## Format source with Graver

Graver is a separate formatter for `.cv` source. Build it from the Carven repository root, then preview one file, check a directory, or update files:

```sh
./xmakew build graver
./xmakew run graver main.cv
./xmakew run graver check examples
./xmakew run graver write examples
```

The first run prints formatted source to stdout without changing the file. `check` lists paths needing changes and returns 1 when differences exist, making it suitable for CI. `write` updates changed files in place. On Windows, use `.\xmakew.ps1`. When calling the built executable directly, replace `./xmakew run graver` with `graver`.

Graver uses a fixed style with four-space indentation and a target width of 100 bytes. It checks lexical and syntactic validity without resolving imports, checking types, or executing const fn or const test. Continue to build and test after formatting. See the [command-line Reference](/reference/cli/#graver) for commands and file selection.

## Put tests at the appropriate layer

Pure compile-time algorithms can use const test, ordinary source behavior uses test, and native interoperability also needs validation in a real C++ build. Successful generation does not prove a provider exists; a passing static assertion does not prove native destructor or exception behavior.

The Carven repository uses ./xmakew with groups including internal, language, crafts, interop, cli, and examples. Consumer projects use their own Xmake targets, not compiler-internal test targets as application APIs.

## Locate the error boundary

1. Missing name: check the input batch, canonical module path, using, and visibility.
2. Type mismatch: check literal context, explicit as, exact parameter access, and success results.
3. Unavailable owner: find the earlier Take and check restoration on every normally continuing path.
4. Borrow conflict: find live str, slices, views, and holders of Write captures.
5. Unhandled failure: inspect the call contract, ?, handler residual set, and outer contract.
6. Native error: check headers, C++ signatures, construction, and link inputs.

## Use the Reference

Choose a topic and check its supported forms, preconditions, evaluation order, and boundary behavior. Tutorial examples build a mental model. Before changing an interface, verify returned borrows, failure sets, ownership transfer, and native provider obligations. Keep observable business requirements in tests.
