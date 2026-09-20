---
title: "Language Reference"
description: "Look up current Carven syntax, validity rules, evaluation behavior, and toolchain boundaries."
section: reference
lesson: 0
source: docs/semantics.md
---

## Scope

This manual describes current Carven source-language rules. Each chapter defines terms and supported forms, then covers evaluation, access, failures, lifetimes, and diagnostic boundaries. “Compile error” means Carven should reject the program. “Termination” means runtime execution ends without producing a catchable typed failure.

The tutorial teaches programming in learning order. The Reference establishes whether a particular program is valid and what happens when it executes. Read fragments in their stated function, variable, or type context. Complete programs specify input files and execution commands.

## Basic model

Carven analyzes a closed batch of `.cv` files and generates C++ headers and implementations. The CLI assembles that batch from explicit application inputs and collected Crafts sources. Within a batch it resolves modules, nominal types, function signatures, constant dependencies, failure sets, ownership, and known borrow relationships. The C++ toolchain checks native declarations, templates, construction, overloads, and linking requirements.

A type describes what a value is. Access describes how an operation uses storage. Ownership determines when a value's lifetime ends. A failure contract describes which failure types a call can propagate. These facts are checked separately.

| Term                | Meaning                                                        |
| ------------------- | -------------------------------------------------------------- |
| Nominal type        | Type determined by a struct or enum declaration's identity     |
| Value               | Result of a computation                                        |
| Storage location    | Readable or writable object, field, element, or pointer target |
| Owner               | Binding owning an immediate value and its scoped lifetime      |
| Read / Write / Take | Reading, non-owning writable access, ownership transfer        |
| Backing             | Object providing actual storage for a slice or text view       |
| Full expression     | Usual evaluation and cleanup boundary for temporaries          |
| Normal completion   | Producing a success result or reaching the next statement      |
| Typed failure       | Recoverable control effect carrying a nominally typed payload  |
| Published interface | Declaration surface visible to readers outside its module      |

## Find a rule in source order

The Reference follows a source file from imports and declarations into function bodies, then covers execution and native integration. Unlike the tutorial, each chapter collects the full rules for one topic.

| In your program                         | Start here                                                                                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source spelling and file imports        | [Lexical syntax](/reference/lexical/), [modules and visibility](/reference/modules/)                                                                       |
| Values, bindings, and declarations      | [Types](/reference/types/), [access and ownership](/reference/ownership/), [structs and enums](/reference/aggregates/), [functions](/reference/functions/) |
| Function bodies and calls               | [Control flow](/reference/control/), [failure contracts](/reference/failures/), [closures](/reference/closures/)                                           |
| Text and borrowed sequences             | [Text](/reference/text/), [slices](/reference/slices/), [formatting](/reference/formatting/)                                                               |
| Compile-time work and program execution | [Constants](/reference/constants/), [entries and tests](/reference/entry-testing/)                                                                         |
| External code and libraries             | [C++ interoperation](/reference/interop/), [pointers](/reference/pointers/), [UTF library](/reference/utf/)                                                |
| Invoking and integrating the compiler   | [CLI and Graver](/reference/cli/), [builds and artifacts](/reference/toolchain/)                                                                           |

The [grammar appendix](/reference/grammar/) retains the complete EBNF productions; the [diagnostic catalog](/reference/diagnostics/) lists current compiler codes. Declaration order is a reading aid here: functions may refer to declarations written later.

## Boundaries of the rules

Carven checks availability, access markers, and borrows of known Carven storage. Providers and callers remain responsible for external address lifetimes, C++ pointer retention, iterator invalidation, reentrancy, and native undefined behavior.

The current source language has no async/await, thread scheduling, atomics, concurrent memory model, user-defined generics, traits, inheritance, source-level destructors, or general reference types. Pointers and C++ integration do not confer those features. This manual describes implemented synchronous evaluation and lifetime rules.
