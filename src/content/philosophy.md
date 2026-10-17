---
title: "Make the program’s choices clear"
description: "Why Carven makes data ownership, recovery, and child task lifetimes visible in source."
section: philosophy
source: docs/development/principles.md
---

## Keep the algorithm in ordinary source

A configuration parser, a log processor, and an asynchronous collector all need answers to the same questions: who owns the data, what happens when a step fails, and when does the work run? Carven makes these decisions visible in source, checks that they fit together, and generates C++ for your native toolchain.

The [example applications](/use-cases/) show how the pieces combine. The analyzer validates records and writes JSON; the mixer processes samples with SIMD; the collector connects a C++ host to Carven logic. Each application has source and tests you can run and change.

## Know who owns the data

Read lets a function inspect an input, Write lets it change existing storage, and Take transfers an owned value. After Take, the original binding cannot be used until it is restored. A text view or slice borrows storage, so that storage must remain valid for every use of the view.

These rules make a practical difference when a function returns text, a closure retains a reference, or a child task outlives the call that started it. The compiler follows the storage relationships it knows. C++ adapters still manage references hidden inside native libraries.

Copying an owned `String` or `Vector<T>` creates independent contents. Copying a view keeps its relationship to the original storage. A class adds private fields and operations to this value model; the fields determine whether it needs allocated storage.

## Keep failures useful to the caller

A parser can fail because a field is missing or because a number is invalid. Those failures can carry different data and require different recovery. Carven keeps their types and payloads as functions compose.

Private helpers infer which failures they may propagate. Shared interfaces declare the allowed set, so callers can use them without inspecting their implementation. Fully handling one failure removes it from the remaining set. The application chooses a default, retries, or translates a library error into its own error type. Recovery keeps changes already made; an operation that needs rollback must define it.

## Choose when the work runs

A fixed JSON template can be parsed once during compilation. A user-supplied configuration must be parsed while the program runs. Both can use the same library functions and data types.

`const fn` says that a function supports compile-time execution. A `const` initializer or static test asks the compiler to execute it there. Ordinary calls stay at runtime. Completed constants keep their types, including owned strings, vectors, and JSON trees; later copies can be modified independently. [The configuration example](/features/compile-time/) follows this process from parsing to a runtime update.

Supported input, clock reads, waits, and output use the host of the chosen stage. A static input read therefore reads from the compiler process. Knowing an argument's value does not move an ordinary call or its effects into compilation.

## Finish child work before releasing its data

An async call creates a cold operation: work that has not started yet. Awaiting it starts it; `async let` starts a child whose lifetime belongs to the surrounding scope. The parent must account for that child before leaving normally.

Cancellation requests a stop. Closing waits for the child and its resource cleanup, so borrowed data remains alive until the work has actually finished. The [async scope example](/playground/#example=async-scope) runs the same flow during compilation and at runtime. Source tasks cooperate on one thread; native providers connect that driver to input, timers, and sockets.

## Leave the native toolchain useful

Carven checks source types, evaluation order, ownership, and failure contracts, then generates C++ interfaces and implementations. C++ checks native calls and templates, optimizes the result, and produces machine code. Existing libraries, debuggers, and profilers remain part of the workflow.

Generated C++ is inspectable. Compare costs with handwritten C++ that provides the same behavior and guarantees, measuring compilation, allocations, artifact size, and execution separately. [The native boundary](/internals/runtime-boundary/) explains how the generated program connects to runtime support and host resources.
