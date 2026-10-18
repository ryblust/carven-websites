---
title: "Standard API index"
description: "Find built-in and source-defined standard APIs by type, operation, and module."
section: reference
lesson: 20
source: docs/language/standard.md
---

## Builtin types and operations

**Built-in** means that the compiler owns a type or operation's semantics, including its type, access, lifetime, failure, and execution rules. Its standard module and default visibility are separate properties: `String` is a default binding from `std::core`, while `Operation` and `when_all` require imports from `std::async`.

Named built-ins follow ordinary name lookup and can be shadowed. See [standard modules and defaults](/reference/modules/#standard-modules-and-defaults) for bindings and import rules.

| Category                     | Reference                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Standard and error output    | [`print`, `println`, `eprint`, `eprintln`](/reference/formatting/#printing)   |
| Runtime assertions           | [`assert`](/reference/entry-testing/#assert)                                  |
| Test assertions and stopping | [`check`, `require`, `fail`](/reference/entry-testing/#test-operations)       |
| Address creation             | [`addressof`](/reference/pointers/#address-values-and-target-access)          |
| Text queries and mutation    | [`str` and `String`](/reference/text/)                                        |
| Sequence queries and views   | [Arrays and slices](/reference/slices/#slice-operations)                      |
| Vector and mask operations   | [SIMD primitives](/reference/simd/)                                           |
| Scalar types and conversions | [Numeric, Boolean, character, and unit types](/reference/types/#scalar-types) |
| Dynamic arrays               | [`Vector<T>`](/reference/aggregates/#owning-vectors)                          |
| Numeric parsing              | [Parsing methods and failures](/reference/types/#numeric-text-parsing)        |
| Imported async built-ins     | [Operation, composition, cancellation, and closure](/reference/async/)        |
| Imported timeout built-in    | [Timeout composition](/reference/time/#deadlines)                             |

## APIs by module

Choose a module by task. The table includes compiler-provided types and operations and source-defined library APIs.

| Need                                                               | Module                                                  | Reference                                                                                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Scalars, numeric parsing, `String`, `Vector`, `Range`, `addressof` | `std::core`                                             | [Types](/reference/types/), [aggregates](/reference/aggregates/), [text](/reference/text/), [pointers](/reference/pointers/) |
| Printing, bounded standard input, byte framing                     | `std::io`                                               | [Input and output](/reference/io/)                                                                                           |
| Cold operations, joins, races, lexical children                    | `std::async`                                            | [Async](/reference/async/)                                                                                                   |
| Intervals, monotonic clocks, waits, deadlines                      | `std::time`                                             | [Time](/reference/time/)                                                                                                     |
| Unicode conversion, validation, splitting, cursors                 | `std::utf`                                              | [UTF](/reference/utf/)                                                                                                       |
| Vector and mask primitives                                         | `std::simd`                                             | [SIMD](/reference/simd/)                                                                                                     |
| Byte/float blocks and byte-set scans                               | `std::simd.bytes`, `std::simd.floats`, `std::simd.scan` | [SIMD](/reference/simd/)                                                                                                     |
| Owned JSON trees, validation, parsing, writing                     | `std::json`                                             | [JSON](/reference/json/)                                                                                                     |
| TCP reads and writes over host connections                         | `std::net`                                              | [Networking](/reference/net/)                                                                                                |
| Test assertions and reports                                        | `std::testing`                                          | [Tests](/reference/entry-testing/)                                                                                           |

Structural type forms such as `[T]`, `(A, B)`, `ptr<T>`, and `fn(...) -> R` are language syntax. They are listed in the [type directory](/reference/types/#scalar-types); they are not names selected by a module import.

## Defaults and explicit imports

[Standard modules and defaults](/reference/modules/#standard-modules-and-defaults) defines module ownership, declaration sources, default bindings, and explicit imports. This example imports and aliases names from several modules:

```carven run
import std::async using when_all as join;
import std::core using String as Text;
import std::json using { Value, ValueError };

const config = Value::parse(r#"{"workers":4,"enabled":true}"#)?;

async fn title() -> Text => "analysis";
private async fn workers() -> i64 => config.get("workers")?.as_i64()?;

async fn main() throw ValueError {
    let (name, count) = await join(title(), workers())?;
    println(f"{name}: {count} workers");
}
```

The program prints `analysis: 4 workers`.

## Execution and ownership

Each capability page states its execution support and result ownership. See [compile-time computation](/reference/constants/) for `const fn`, retained results, and budgets; [async](/reference/async/) for operation lifetimes; and [workflow](/learn/workflow/) for Playground execution.

See [built-in capabilities and runtime support](/internals/runtime-boundary/) for the roles of Standard Craft, built-ins, and Runtime Craft.

[Modules](/reference/modules/) defines Craft paths and visibility. The [CLI](/reference/cli/) defines source collection and retained artifacts.
