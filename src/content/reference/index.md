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
<a class="reference-entry" href="/reference/builtins/"><strong>Builtin functions and type APIs</strong><span>Output, assertions, text, and sequence operations without imports</span></a>
<a class="reference-entry" href="/reference/library/"><strong>Standard library reference</strong><span>UTF and SIMD signatures and contracts, organized by module</span></a>
</div>

## Find syntax and rules

This manual describes Carven's implemented language. Look up a keyword, syntax category, or type to find its forms, minimal examples, execution rules, and restrictions. The [tutorial](/learn/) builds programs by task; [design and principles](/design/) explains design choices and implementation.

| What you need                                     | Start here                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Declarations with `let`, `var`, and `const`       | [Variable declarations and scope](/reference/bindings/)                                                       |
| Evaluation of `+`, `&&`, `as`, and `..`           | [Operators and expressions](/reference/operators/), [types and conversions](/reference/types/)                |
| Forms of `if`, `while`, `for`, and `match`        | [Branches, loops, and control transfers](/reference/control/)                                                 |
| `fn`, parameters, results, and closures           | [Functions](/reference/functions/), [closures](/reference/closures/)                                          |
| `struct`, `class`, `enum`, and arrays             | [Aggregate types](/reference/aggregates/)                                                                     |
| `&`, `&&`, borrowing, and pointers                | [Access and ownership](/reference/ownership/), [slices](/reference/slices/), [pointers](/reference/pointers/) |
| `throw`, `try`, `catch`, and `?`                  | [Failure contracts](/reference/failures/)                                                                     |
| Strings, raw and multiline text, interpolation    | [Characters and text](/reference/text/), [formatting and output](/reference/formatting/)                      |
| `import`, `using`, `export`, and `private`        | [Modules and visibility](/reference/modules/)                                                                 |
| `const fn`, static parameters, and static control | [Compile-time computation](/reference/constants/), [functions](/reference/functions/#static-parameters)       |
| `main`, `test`, and assertions                    | [Entries and tests](/reference/entry-testing/)                                                                |
| C++ headers, functions, and source fragments      | [C++ interoperation](/reference/interop/)                                                                     |

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
| A constant produces owning text or array backing              | [Admission and freezing](/reference/constants/#admission-and-freezing)                                                                        |
| A value is initialized with `{}` or code follows `if false`   | [Default initialization](/reference/aggregates/#default-initialization), [inactive-code checks](/reference/control/#order-and-inactive-code)  |

## Libraries, tools, and appendices

The [UTF library](/reference/utf/) and [SIMD](/reference/simd/) cover library and vector operations. [Compiler commands](/reference/cli/) and [build integration](/reference/toolchain/) describe invoking tools, generating artifacts, and integrating them.

The [grammar appendix](/reference/grammar/) gives the complete EBNF. The [diagnostic catalog](/reference/diagnostics/) helps locate errors by compiler code.

## Reading examples

Start with the syntax form, then check its type, access, failure, and lifetime rules. “Compile error” means Carven should reject the program. “Termination” means execution ends without a catchable typed failure.

Unless noted otherwise, save each complete example separately as `main.cv` and run it natively with `carven main.cv`. Check a compile-error example separately with `carven check main.cv`. Fragments and syntax templates need their stated context; do not combine independent examples into one program. Run `test` examples with `carven --tests main.cv`; `const test` executes during checking. See [your first program](/learn/first-program/) for setup and commands.

## Terms

Rule pages use these terms where needed. A type describes a value; access describes use of storage; ownership determines lifetime; a failure contract lists the failures a call may propagate.

| Term                | Meaning                                                            |
| ------------------- | ------------------------------------------------------------------ |
| Nominal type        | Type determined by a struct, class, or enum declaration's identity |
| Value               | Result of a computation                                            |
| Storage location    | Readable or writable object, field, element, or pointer target     |
| Owner               | Binding owning an immediate value and its scoped lifetime          |
| Read / Write / Take | Reading, non-owning writable access, ownership transfer            |
| Backing             | Object providing actual storage for a slice or text view           |
| Full expression     | Usual evaluation and cleanup boundary for temporaries              |
| Normal completion   | Producing a success result or reaching the next statement          |
| Typed failure       | Recoverable control effect carrying a nominally typed payload      |
| Published interface | Declaration surface visible to readers outside its module          |

## Boundaries of the rules

Carven checks availability, access markers, and borrows of known Carven storage. Providers and callers remain responsible for external address lifetimes, C++ pointer retention, iterator invalidation, reentrancy, and native undefined behavior.

The current source language has no async/await, thread creation or synchronization, atomics, concurrent memory model, user-defined generics, traits, inheritance, virtual dispatch, source-level destructors or custom copy/move hooks, or general reference types. Read/Write/Take do not establish cross-thread safety. Pointers and C++ integration do not confer those features. This manual describes implemented synchronous evaluation and lifetime rules.
