---
title: "C++ generation and native integration"
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

Use `import(cpp)` for the stream provider and `export(cpp)` for the collection entry. The [interop reference](/reference/interop/) covers these declarations, header imports, and inline C++ fragments.

An `export(cpp)` function receives a self-contained API header under `carven/api/<canonical-module-path>.hpp`. The host includes it and calls the function in its `carven::api` module namespace. A concrete `import(cpp)` declaration also gets a `carven/providers` header with aliases for its signature types; C++ still supplies the provider declaration and implementation.

Run the complete host example from the compiler repository root:

```sh
./xmakew build
./xmakew build examples
./xmakew run carven-example-stream-collector
```

The host keeps its streams alive during collection and receives a report with independent strings. Xmake arranges source generation, native compilation, and linking. The [toolchain reference](/reference/toolchain/) gives manual build commands and native support requirements.

## Keep evaluation and cleanup in the right order

Consider an aggregate whose first field is constructed successfully but whose second field fails. The first value must remain valid while the second is evaluated, then be cleaned up on the failure path. The generated C++ arranges temporaries, scopes, and result construction to preserve that behavior.

These temporaries preserve the [ownership and evaluation rules](/reference/ownership/). Native component types must support the copies or moves needed by the generated construction.

## Organize headers from type dependencies

Some declarations need a complete definition of another type. The compiler groups modules connected by those requirements into interface components and uses forward declarations for other relationships. Dependencies used only inside function bodies stay in implementation files. A private body edit can therefore leave public headers unchanged.

Before generation, analysis checks source types, access, ownership, failure sets, and async use. The backend consumes that checked program to choose representations and construct C++ syntax. Native overloads, templates, layout, and machine-code optimization remain C++ toolchain work. The [architecture article](/internals/compiler-architecture/) follows the handoffs in detail.

## Export an asynchronous entry point

`export(cpp) async fn` exposes an `AsyncOperation` in the generated API. The host starts an exported root with `drive_root(operation, &source)`, supplying the event source and keeping native resources alive until the root and its children finish. The generated implementation uses C++ coroutines.

[Built-in capabilities and runtime support](/internals/runtime-boundary/) explains the driver and provider cleanup. Native exception handling is defined at the [noexcept boundary](/reference/interop/#noexcept).

## Reuse what analysis already established

Known access determines parameter passing and cleanup. Known result destinations can permit direct construction. Static parameters select branches and expand iterations before runtime. Fixed formatting structure and proven encoding can prepare writes without parsing the same format again.

These choices preserve required evaluation, effects, and lifetimes. One published semantic program can also generate ordinary and test artifacts without repeating compile-time work. A retained analysis directory can feed `compile`; [the toolchain reference](/reference/toolchain/) describes the artifact contract.
