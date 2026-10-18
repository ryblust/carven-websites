---
title: "Built-ins and runtime support"
description: "Distinguish compiler-owned semantics, standard module visibility, and the native support that executes a program."
section: internals
source: docs/development/principles.md
---

## Find and use a capability

To use a capability, first identify its module and whether its name is already visible. For example, `String` and `println` have default bindings. Async composition uses an explicit import:

```carven run
import std::async using when_all;

async fn amount() -> i32 => 42;
async fn ready() -> bool => true;

async fn main() {
    let (count, available) = await when_all(amount(), ready());
    println(count, available);
}
```

`when_all` is a built-in operation in `std::async`. The compiler derives the tuple's element types and combined failure set and checks that the composition takes ownership of its input operations. The explicit import makes the name visible in this module.

Module ownership and default visibility are separate properties. A standard module can contain both compiler-provided declarations and source exports. `std::core` is a module identity even though its compiler-provided entries need no matching `core.cv` file.

Use the [module reference](/reference/modules/) to look up default bindings and import rules, and the [standard API index](/reference/library/) to find an API's module.

## API, compiler semantics, and native support

One capability can use all three layers:

| Layer          | Responsibility                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Standard Craft | Public declarations and reusable source implementations, organized in standard modules                                                    |
| Built-ins      | Types and operations whose type, access, lifetime, failure, and execution semantics the compiler owns                                     |
| Runtime Craft  | Native representations and operations used by generated C++, including storage, formatting, failure carriers, tests, and the async driver |

For `when_all`, the public entry belongs to `std::async`, the compiler checks its composition rules, and generated C++ uses Runtime Craft support to execute it. For JSON parsing, the standard-source algorithm calls ordinary operations and builds a source-defined `Value`. Both follow Carven's access, ownership, failure, and execution rules.

`print` accepts differently typed arguments in order. `when_all` combines differently typed operation results into a tuple. The compiler uses the argument types to determine each call’s result and execution contract. Source functions express algorithms using the existing language operations.

The Standard Craft lives in `crafts/carven/std/`, with native support beside capabilities that need it. The Runtime Craft lives in `crafts/carven/runtime/`. The compiler build is independent of their C++ headers and libraries; a generated native application builds with the support its capabilities require.

## Runtime support and execution stages

**Runtime Craft** names a native support package. **Runtime execution** names the stage of ordinary program calls. A `const` initializer or static test selects compiler-side execution; an ordinary call remains at runtime even when its arguments are known.

The semantic executor implements supported built-ins and runs standard-source functions during static execution and interpretation. Generated C++ supplies their native representations and operations. Both preserve the same values, evaluation order, access, ownership, and failures within the supported stages.

The [constant reference](/reference/constants/) defines compiler-side execution and host operations; the [command reference](/reference/cli/) describes interpretation.

## Connect asynchronous work to host resources

Calling a source async function creates a cold operation. Awaiting or starting it as a child runs it through the driver. Native execution uses C++ coroutines; ready continuations, provider events, and timers are serviced on one thread.

A native async provider returns `AsyncOperation<Result, Failures...>`. It commits success, a declared failure, or cancellation, then queues the continuation that resumes source execution. The host retains the event source and resources until the root operation and its children finish.

`cancel` requests a stop. `close` waits for the child and provider cleanup before releasing the child's active borrow. Joins, selection, and timeout compositions also close their children before delivering an outcome. A provider still using callback state must keep that state valid throughout cleanup.

Native input, timers, and network operations connect this driver to host resources. Their APIs are defined in the [input](/reference/io/), [time](/reference/time/), and [network](/reference/net/) references.

[C++ generation and native integration](/features/cpp-generation/) explains the generated headers, provider boundaries, and build inputs that connect these capabilities to a native application.
