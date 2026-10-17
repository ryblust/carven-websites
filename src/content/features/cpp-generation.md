---
title: "From a Carven module to a C++ project"
description: "Follow a stream collector into generated headers and implementations, including ownership and cleanup."
section: cpp-generation
source: docs/compiler/backend/README.md
---

## One source for the interface and implementation

When a module's data or function signature changes, a C++ project needs its declarations, definitions, and callers to stay consistent. Carven takes the module's checked types and functions as one source for the generated headers and implementations. Your C++ toolchain then compiles, links, and optimizes those files.

The stream collector shows this with a report that owns the records it returns:

```carven
export struct Report {
    records: Vector<String>,
    total: usize,
    duplicates: usize
}
```

Its C++ provider returns a text view that is valid until the next read. Carven copies records it wants to keep into `String`, removes duplicates, and returns the completed report. `import(cpp)` declares the provider operation; `export(cpp)` exposes the collection function to the host. The [complete source](https://github.com/ryblust/carven/blob/main/examples/stream_collector/workflow.cv) shows both directions.

## Connect to an existing C++ project

An `export(cpp)` function receives a self-contained API header under `carven/api/<canonical-module-path>.hpp`. The host includes it and calls the function in its `carven::api` module namespace. A concrete `import(cpp)` declaration also gets a `carven/providers` header with aliases for its signature types; C++ still supplies the provider declaration and implementation.

Run the complete host example from the compiler repository root:

```sh
./xmakew build
./xmakew build examples
./xmakew run carven-example-stream-collector
```

The host keeps its streams alive during collection and receives a report with independent strings. Xmake arranges source generation, native compilation, and linking. For a manual build, `carven compile -o out` writes the generated files; supply the required native support sources, include paths, and libraries as well. `compile --stdout` displays the artifacts for inspection.

## Keep evaluation and cleanup in the right order

Consider an aggregate whose first field is constructed successfully but whose second field fails. The first value must remain valid while the second is evaluated, then be cleaned up on the failure path. The generated C++ arranges temporaries, scopes, and result construction to preserve that behavior.

Carven evaluates operands once, from left to right on the selected path. Read parameters preserve the required observations of their inputs; Write permits mutation; Take transfers an owner and makes the source unavailable. A named return copies unless it uses `return &&owner`. C++ checks the construction requirements of native components, including any copy or move needed for intermediate storage.

A Carven class uses the same model. Its fields determine storage and cleanup; generated ordinary functions implement its explicit receivers. The class declaration itself adds no inheritance, virtual dispatch, or allocation.

## Organize headers from type dependencies

Some declarations need a complete definition of another type. The compiler groups modules connected by those requirements into interface components and uses forward declarations for other relationships. Dependencies used only inside function bodies stay in implementation files. A private body edit can therefore leave public headers unchanged.

Before generation, analysis checks source types, access, ownership, failure sets, and async use. The backend consumes that checked program to choose representations and construct C++ syntax. Native overloads, templates, layout, and machine-code optimization remain C++ toolchain work. The [architecture article](/internals/compiler-architecture/) follows the handoffs in detail.

## Carry async work through the same interface

An async call returns a cold operation: work that starts when awaited or started as a child. Generated C++ implements source async functions with coroutines. The driver runs ready continuations on one thread and services input, event sources, and timers.

`when_all` keeps results in input order. Selection and timeout operations wait for their children to close before delivering an outcome. That wait protects borrowed data until the work and its provider cleanup have finished.

`export(cpp) async fn` exposes an `AsyncOperation` in the generated API. The native host drives it with its context and event source, retaining resources until execution and child closure finish. A cancellation request alone does not prove that a native callback has stopped accessing its state; see [the runtime boundary](/internals/runtime-boundary/).

## Reuse what analysis already established

Known access determines parameter passing and cleanup. Known result destinations can permit direct construction. Static parameters select branches and expand iterations before runtime. Fixed formatting structure and proven encoding can prepare writes without parsing the same format again.

These choices preserve required evaluation, effects, and lifetimes. One published semantic program can also generate ordinary and test artifacts without repeating compile-time work. A retained analysis directory can feed `compile`; [the toolchain reference](/reference/toolchain/) describes the artifact contract.
