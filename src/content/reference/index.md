---
title: "Language Reference"
description: Look up current Carven syntax and rules by keyword, construct, type, and library.
section: reference
lesson: 0
source: docs/language/README.md
---

## Reference entry points

<div class="reference-entry-grid">
<a class="reference-entry" href="#find-syntax-and-rules"><strong>Language syntax</strong><span>Keywords, variables, types, expressions, and control flow</span></a>
<a class="reference-entry" href="/reference/library/"><strong>Standard API index</strong><span>Find built-in and source-defined APIs by type, operation, and module</span></a>
<a class="reference-entry" href="/reference/diagnostics/"><strong>Diagnostic codes</strong><span>Look up compiler errors, warnings, and related rules by code</span></a>
</div>

## Find syntax and rules

For a guided introduction, use the [tutorial](/learn/). For design choices and implementation, read [design and principles](/design/).

| What you need                                                      | Start here                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Declarations with `let`, `var`, and `const`                        | [Variable declarations and scope](/reference/bindings/)                                                                                                                                                                                         |
| Evaluation of `+`, `&&`, `as`, and `..`                            | [Operators and expressions](/reference/operators/), [types and conversions](/reference/types/)                                                                                                                                                  |
| Forms of `if`, `while`, `for`, and `match`                         | [Branches, loops, and control transfers](/reference/control/)                                                                                                                                                                                   |
| `fn`, parameters, results, captures `[value]` / `[&value]`         | [Functions](/reference/functions/), [closures](/reference/closures/)                                                                                                                                                                            |
| `struct`, `class`, `enum`, arrays, and `Vector<T>`                 | [Aggregate types](/reference/aggregates/)                                                                                                                                                                                                       |
| Type forms `()`, `(T,)`, `[T; N]`, `[T]`, `ptr<T>`, `fn(...) -> R` | [Scalar and compound type directory](/reference/types/#scalar-types), [tuples](/reference/aggregates/#tuples), [slices](/reference/slices/), [pointers](/reference/pointers/), [callable views](/reference/closures/#non-owning-callable-views) |
| Parameters `<T>` and `<T, throw E>`                                | [Parameterized functions](/reference/functions/#parameterized-functions), [parameterized types](/reference/types/#nominal-type-parameters), [failure-set parameters](/reference/failures/#failure-set-parameters)                               |
| Patterns `is T`, `\|`, `&name`, and `..`                           | [Match and patterns](/reference/control/#match-and-patterns), [integer range patterns](/reference/control/#integer-range-patterns)                                                                                                              |
| `async fn`, `async let`, `await`, and `cancel`                     | [Operations](/reference/async/#cold-operations-and-await), [composition](/reference/async/#cold-composition), [children and cancellation](/reference/async/#lexical-children-and-cancellation)                                                  |
| Qualification `Type::name`, `::native`, and tuple fields `.0`      | [Associated and native names](/reference/operators/#operator-overview), [positional fields](/reference/aggregates/#tuples)                                                                                                                      |
| `&`, `&&`, borrowing, `ptr<T>`, `*p`, and `p->member`              | [Access and ownership](/reference/ownership/), [slices](/reference/slices/), [pointers](/reference/pointers/)                                                                                                                                   |
| `throw`, `try`, `catch`, and `?`                                   | [Failure contracts](/reference/failures/)                                                                                                                                                                                                       |
| Text literals `"..."`, `r#"..."#`, `"""..."""`, `f"..."`           | [Characters and text](/reference/text/), [formatting and output](/reference/formatting/)                                                                                                                                                        |
| `import`, `using`, `export`, and `private`                         | [Modules and visibility](/reference/modules/)                                                                                                                                                                                                   |
| `const fn`, static parameters, and static control                  | [Compile-time computation](/reference/constants/), [functions](/reference/functions/#static-parameters)                                                                                                                                         |
| `main`, `test`, and assertions                                     | [Entries and tests](/reference/entry-testing/)                                                                                                                                                                                                  |
| C++ headers, `c"..."`, `import(cpp)`, `export(cpp)`, `#[cpp]`      | [C++ interoperation](/reference/interop/)                                                                                                                                                                                                       |

Start with the [keyword index](/reference/keywords/) when you know a spelling. Use the search at the top to find titles, topics, keywords, or common symbols such as `let`, `break`, and `?`.

## Defaults and contextual behavior

Some effects follow from a known type or enclosing boundary. Check these rules when an operation appears to do more than its spelling suggests.

| Situation                                                     | Rule to check                                                                                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Special name accepted in one position but rejected in another | [Reserved and contextual spellings](/reference/keywords/)                                                                                     |
| An omitted type or leading `.Case` / `{ ... }`                | [Local expected-type rules](/reference/types/#expected-types), [construction](/reference/aggregates/#contextual-construction)                 |
| Owning text or an array used where a view is expected         | [Contextual adaptations](/reference/types/#contextual-adaptations), including borrow lifetime                                                 |
| Read arguments affected by a later argument's mutation        | [Read values and aliases](/reference/ownership/#read-values-and-aliases)                                                                      |
| A named owner returned or used to initialize another owner    | [Copying and explicit Take](/reference/ownership/#take-and-availability)                                                                      |
| A catch list covers only some failures                        | [Residual forwarding at the try boundary](/reference/failures/#partial-catches-and-residual-sets)                                             |
| A named text or slice borrow is no longer used                | [Text borrow duration](/reference/text/#borrows-and-mutation), [slice duration](/reference/slices/#borrow-duration); last use does not end it |
| A `const fn` called with literal arguments                    | [Compile-time capability](/reference/functions/#compile-time-capability); an ordinary call stays at runtime                                   |
| A constant produces owning text or array backing              | [Admission and freezing](/reference/constants/#constant-results-and-storage)                                                                  |
| A value is initialized with `{}` or code follows `if false`   | [Default initialization](/reference/aggregates/#default-initialization), [inactive-code checks](/reference/control/#order-and-inactive-code)  |

## Libraries, tools, and appendices

Use the [standard API index](/reference/library/) to choose APIs for text, SIMD, async operations, time, input, JSON, and networking. [Compiler commands](/reference/cli/) and [build integration](/reference/toolchain/) describe invoking tools, generating artifacts, and integrating them.

The [grammar appendix](/reference/grammar/) gives the complete EBNF. The [diagnostic catalog](/reference/diagnostics/) helps locate errors by compiler code.

## Reading examples

“Compile error” means Carven rejects the program. “Termination” means execution ends without a catchable typed failure.

Complete examples with a **Run** button can be executed directly; their output appears below the code.

See [your first program](/learn/first-program/) for local setup and commands, and [test declarations](/reference/entry-testing/#test-declarations) for running test examples. Fragments and syntax templates require their stated context.

## Terms

| Term                | Meaning                                                                    |
| ------------------- | -------------------------------------------------------------------------- |
| Nominal type        | Type determined by a struct, class, or enum declaration's identity         |
| Value               | Result of a computation                                                    |
| Storage location    | Readable or writable object, field, element, or pointer target             |
| Owner               | Binding or containing value responsible for a value's lifetime and cleanup |
| Read / Write / Take | Reading, non-owning writable access, ownership transfer                    |
| Backing             | Object providing actual storage for a slice or text view                   |
| Full expression     | An expression together with the temporary values kept until it finishes    |
| Normal completion   | Producing a success result or reaching the next statement                  |
| Typed failure       | A declared struct or enum value reported instead of a successful result    |
| Published interface | Declaration surface visible to readers outside its module                  |

## Boundaries of the rules

Carven checks availability, access markers, and borrows of known Carven storage. Providers and callers remain responsible for external address lifetimes, C++ pointer retention, iterator invalidation, reentrancy, and native undefined behavior.

For external storage and concurrency responsibilities, see [C++ access and lifetimes](/reference/interop/#access-and-lifetimes).
