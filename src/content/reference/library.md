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

## Try complete programs

The native project tutorial provides complete files and local commands. Open a browser example to execute it, change its inputs, and inspect the result. Choose **Test** for the async test example.

| Task                                                    | Complete example                                               | Rules and explanation                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Build an application and run its same-file inline tests | [Build a native project](/learn/build/)                        | [Build and query API](/reference/build/)                                            |
| Parse TOML and summarize with hash collections          | [TOML summary](/playground/#example=toml-summary)              | [TOML](/reference/toml/), [collections](/reference/collections/)                    |
| Execute a closure policy at compile time and runtime    | [Closure policy](/playground/#example=closure-policy)          | [Closures](/learn/closures/), [static execution](/reference/constants/)             |
| Transfer owned bytes through a bounded channel          | [Producer and consumer](/playground/#example=channel-pipeline) | [Byte channels](/reference/channel/), [async](/learn/async/)                        |
| Write and read a report in the browser filesystem       | [File report](/playground/#example=file-report)                | [Files and paths](/reference/fs/)                                                   |
| Run tests that await child tasks                        | [Async tests](/playground/#example=async-tests)                | [Testing](/learn/testing/), [async test contracts](/reference/entry-testing/)       |
| Call a source function from a page and test its rules   | [Interactive pricing](/playground/#example=pricing-preview)    | [Native and hosted execution](/reference/interop/), [inline tests](/learn/testing/) |
| Supply text and files, then download a report           | [Input and files](/playground/#example=workspace-report)       | [Standard input](/reference/io/), [files](/reference/fs/)                           |

The [interactive pricing project](/playground/#example=pricing-preview) keeps a hosting session active between calls. Amount and discount changes update the quote automatically. Choose **Update preview** to apply source edits; valid updates replace the implementation; a failed source check leaves the previous version available for new inputs. The Files view appears for file examples or actual generated files. Results stay in memory; only **Download** saves a file to your computer. Generated results are excluded from drafts. Each example has its own files and draft, with `main.cv` as the program entry. Use the file tree or tabs to select files, and add a file with the suggested name or a relative path.

Use the same language for native projects: start with the [declarative build](https://github.com/ryblust/carven/tree/v0.1.0/examples/build/declarative), then [read TOML, generate source, and assemble a build plan](https://github.com/ryblust/carven/tree/v0.1.0/examples/build/imperative). The [build API](/reference/build/) defines targets, dependencies, and queries; [tools and workflow](/learn/workflow/) gives the working steps.

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
| Owned maps, sets, hashing, and byte digests                        | `std::collections`                                      | [Collections](/reference/collections/)                                                                                       |
| Bounded messages between async tasks                               | `std::channel`                                          | [Channels](/reference/channel/)                                                                                              |
| Files, directories, and paths                                      | `std::fs`                                               | [Filesystem](/reference/fs/)                                                                                                 |
| Host queries and child processes                                   | `std::process`                                          | [Processes](/reference/process/)                                                                                             |
| Owned TOML trees and borrowed traversal                            | `std::toml`                                             | [TOML](/reference/toml/)                                                                                                     |
| Native plans, project discovery, and compilation                   | `std::build`, `std::compiler`                           | [Project builds](/reference/build/)                                                                                          |

Structural type forms such as `[T]`, `(A, B)`, `ptr<T>`, and `fn(...) -> R` are language syntax. They are listed in the [type directory](/reference/types/#scalar-types); they are not names selected by a module import.

## Defaults and explicit imports

[Standard modules and defaults](/reference/modules/#standard-modules-and-defaults) defines module ownership, declaration sources, default bindings, and explicit imports. This example imports and aliases names from several modules:

```carven run
import std::async using when_all as join;
import std::core using String as Text;
import std::json using { JSONValue, JSONValueError }

const config = JSONValue::parse(r#"{"workers":4,"enabled":true}"#)?;

async fn title() -> Text => "analysis";
private async fn workers() -> i64 => config.get("workers")?.as_i64()?;

async fn main() throw JSONValueError {
    let (name, count) = await join(title(), workers())?;
    println(f"{name}: {count} workers");
}
```

The program prints `analysis: 4 workers`.

## Execution and ownership

Each capability page states its execution support and result ownership. See [compile-time computation](/reference/constants/) for `const fn`, retained results, and budgets; [async](/reference/async/) for operation lifetimes; and [workflow](/learn/workflow/) for Playground execution.

See [built-in capabilities and runtime support](/internals/runtime-boundary/) for the roles of Standard Craft, built-ins, and Runtime Craft.

[Modules](/reference/modules/) defines Craft paths and visibility. The [CLI](/reference/cli/) defines source collection and retained artifacts.
