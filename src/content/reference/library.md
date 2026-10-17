---
title: "Standard capabilities"
description: "Find standard types, functions, modules, and execution contracts."
section: reference
lesson: 21
source: docs/language/standard.md
---

## Choose a capability

Choose a module by the task in the table below. Import the names you use with `import std::module using Name;`. The same import syntax applies whether a declaration comes from the compiler or a Carven source library. A parent module does not open its children, and selecting a function does not bind the names of its result or failure types.

| Need                                                            | Module                                                  | Reference                                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Scalars, numeric parsing, `String`, `Vector`, `Range`, pointers | `std::core`                                             | [Types](/reference/types/), [aggregates](/reference/aggregates/), [text](/reference/text/), [pointers](/reference/pointers/) |
| Printing, bounded standard input, byte framing                  | `std::io`                                               | [Input and output](/reference/io/)                                                                                           |
| Cold operations, joins, races, lexical children                 | `std::async`                                            | [Async](/reference/async/)                                                                                                   |
| Intervals, monotonic clocks, waits, deadlines                   | `std::time`                                             | [Time](/reference/time/)                                                                                                     |
| Unicode conversion, validation, splitting, cursors              | `std::utf`                                              | [UTF](/reference/utf/)                                                                                                       |
| Vector and mask primitives                                      | `std::simd`                                             | [SIMD](/reference/simd/)                                                                                                     |
| Byte/float blocks and byte-set scans                            | `std::simd.bytes`, `std::simd.floats`, `std::simd.scan` | [SIMD](/reference/simd/)                                                                                                     |
| Owned JSON trees, validation, parsing, writing                  | `std::json`                                             | [JSON](/reference/json/)                                                                                                     |
| TCP reads and writes over host connections                      | `std::net`                                              | [Networking](/reference/net/)                                                                                                |
| Test assertions and reports                                     | `std::testing`                                          | [Tests](/reference/entry-testing/)                                                                                           |

## Defaults and explicit imports

Core scalar/text names, `Vector`, `Range`, `assert`, `addressof`, printing names, `stdin`, testing helpers, and SIMD type names are supplied by default. `Operation` and async/time callables require imports. All these names follow ordinary lookup and shadowing; aliases preserve the same canonical entities.

```carven
import std::core using String as Text;
import std::json using { Value, ValueError };
import std::async using when_all as join;

const config = Value::parse(r#"{"workers":4,"enabled":true}"#)?;

async fn title() -> Text => "analysis";
private async fn workers() -> i64 => config.get("workers")?.as_i64()?;

async fn main() throw ValueError {
    let (name, count) = await join(title(), workers())?;
    println(f"{name}: {count} workers");
}
```

The program prints `analysis: 4 workers`. The JSON tree is retained with its owning type at compilation; the two cold operations execute when awaited. Failures inferred from `workers` remain obligations at the join and are propagated with `?`.

## Execution and ownership

`const fn` permits explicit static execution. Ordinary calls stay at runtime. JSON, UTF, Vector, scalar parsing, floating methods, async composition, input, clocks, and waits share supported semantic execution with interpretation. Static input/time operations observe the compiler host and make retained analysis noncacheable; budgets do not bound elapsed waiting.

Owning constants preserve `String`, Vector, classes, and JSON contents. Borrowed results still need valid backing; operation owners cannot be frozen. Native C++ implementations and TCP providers require native execution. The browser Playground has an empty input stream, no native providers, and request deadlines; see [workflow](/learn/workflow/).

Crafts are source packages assembled by the toolchain or external build system. Standard paths, declaration visibility, default bindings, and local aliases are defined by [modules](/reference/modules/); source collection and retained artifacts are defined by the [CLI](/reference/cli/).
