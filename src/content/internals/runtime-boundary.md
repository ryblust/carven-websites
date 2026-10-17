---
title: "What generated C++ needs to run"
description: "Connect Carven libraries and runtime support to input, timers, sockets, and C++ hosts."
section: internals
source: docs/compiler/README.md
---

## What supports the generated program

Generated C++ needs concrete implementations for text storage, vectors, failure results, printing, and async execution. These live in `crafts/carven/runtime/`. Standard modules combine compiler-provided declarations with checked Carven source in `crafts/carven/std/`, plus native support for capabilities that access the host.

For example, JSON parsing is a source algorithm. Reading a socket needs a native provider: C++ code that performs the host operation under a declared Carven contract. The compiler checks source uses of that contract; it does not build against the provider's headers or native libraries.

| Layer            | Responsibility                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Compiler         | Check source contracts, execute admitted static work, and generate C++                                       |
| Language runtime | Implement native values, formatting, result carriers, tests, and the coroutine driver                        |
| Standard modules | Supply public APIs and checked algorithms for core data, UTF, SIMD, JSON, input, time, async, and networking |
| Native providers | Perform host operations and keep their hidden resources valid                                                |
| Native build     | Compile and link the selected generated sources, native support, and dependencies                            |

`Read<T>`, `Duration`, `Timeout`, UTF errors, and input handles are standard-source declarations found through ordinary module lookup. Checked text construction, input error mapping, and public waits also have source bodies. Their host access uses module-local provided operations.

## Keep owned data and views distinct

An owned `String` or `Vector<T>` can be copied into independent storage. A `str` or slice is a view: copying it still refers to its original data. These relationships apply during static execution as well as runtime execution. Completed constants retain their owning types; a frozen view has immutable program-lifetime backing.

Native parameter passing preserves the checked observations. Pure snapshot values may pass by value; Read inputs containing owner storage retain access to that storage. Write uses mutable references, and Take changes the source binding's availability while delivering ownership.

The semantic executor tracks typed values and lifetimes within its budgets. Generated C++ supplies the corresponding storage, evaluation order, and cleanup. Compiler-host addresses are never copied into target constants as raw addresses.

## Wait for work and its cleanup

Calling a source async function creates a cold operation. Awaiting or starting it as a child runs it through the driver. Native execution uses C++ coroutines; ready continuations, provider events, and timers are serviced on one thread.

A native async provider returns `AsyncOperation<Result, Failures...>`. It commits success, a declared failure, or cancellation, then queues the continuation that resumes source execution. A native host drives an exported root with `drive_root(operation, &source)` and retains its event source and resources until the root and children finish.

Requesting cancellation does not mean that a callback has stopped using its state. `close` waits for the child and provider cleanup before releasing the child's active borrow. Joins, selection, and timeout compositions also close their children before delivering an outcome. Work that never accepts cancellation can delay that wait.

## Connect input, timers, and TCP to a host

`std::io` provides bounded cold standard-input reads and byte framing. `std::time` provides checked durations, monotonic points, waits, and timeout composition. Static calls use compiler-process resources; ordinary calls use runtime-process resources. The browser's input stream is empty, and external native providers require a local native host.

For `std::net`, the C++ host creates a `Network`, adopts already-connected sockets into address-stable `Connection` objects, and supplies named views to Carven. It keeps these objects and hidden state alive until pending operations and cleanup finish. One read and one write may be active per connection. Windows consumers link `ws2_32`.

This source API handles reads and writes on existing connections. Connection establishment, listening, name resolution, and TLS belong to the host or its libraries. The [network reference](/reference/net/) gives the full contract.

## Bring C++ code across a declared boundary

| Form          | How it connects                                                                        |
| ------------- | -------------------------------------------------------------------------------------- |
| Header import | Makes an ordered C++ include and delegated native name lookup available                |
| `import(cpp)` | Declares a Carven callable implemented by a C++ provider                               |
| `export(cpp)` | Generates an API header and function façade under the module's `carven::api` namespace |
| `#[cpp]`      | Places authored C++ source in an implementation artifact                               |

C++ checks external names, overloads, templates, and conversions. Adapters manage hidden references, callback retention, synchronization, and native exceptions. If recovery from an exception is needed, catch it before it escapes a generated `noexcept` boundary.

## Build the complete native application

`carven compile` emits generated interfaces and implementations. The native build also supplies the required provider sources, include paths, and libraries. The Xmake rule arranges source discovery, generation, compilation, and linking; see [toolchain reference](/reference/toolchain/).

Generated programs use C++20. Building the compiler has a separate C++26 host requirement. The [stream collector](https://github.com/ryblust/carven/tree/main/examples/stream_collector) contains a complete C++ host calling Carven and receiving an owned report; the [interop tutorial](/learn/interop/) starts with a third-party library call.
