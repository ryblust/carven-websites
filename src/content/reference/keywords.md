---
title: Keyword index
description: Look up declarations, control flow, modules, failures, and compile-time forms by keyword.
section: reference
lesson: 1
source: docs/language/grammar.md
---

## Keyword index

The table below lists the 30 lexically reserved keywords: they cannot name ordinary variables, parameters, fields, functions, or types. Some other special spellings are contextual or resolved as ordinary names; their rules appear after the table. Module-path components accept keyword spellings under the [module-path rules](/reference/modules/).

| Keyword                                    | Role                                                          |
| ------------------------------------------ | ------------------------------------------------------------- |
| [`as`](/reference/types/)                  | Explicit type conversion                                      |
| [`break`](/reference/control/#break)       | Leave the nearest loop                                        |
| [`catch`](/reference/failures/)            | Handle matching typed failures                                |
| [`class`](/reference/aggregates/)          | Declare a value class with private fields and operations      |
| [`const`](/reference/constants/)           | Declare constants, compile-time functions, and static control |
| [`continue`](/reference/control/#continue) | Start the next loop iteration                                 |
| [`else`](/reference/control/#if)           | Fallback branch of an if                                      |
| [`enum`](/reference/aggregates/)           | Declare a numeric or payload enum                             |
| [`export`](/reference/modules/)            | Publish a module interface                                    |
| [`false`](/reference/lexical/)             | Boolean false literal                                         |
| [`fn`](/reference/functions/)              | Declare a function or callable-view type                      |
| [`for`](/reference/control/#for)           | Iterate a sequence or loop with steps                         |
| [`if`](/reference/control/#if)             | Conditional branches, value branches, and pattern guards      |
| [`import`](/reference/modules/)            | Import a module, C++ header, or native function               |
| [`in`](/reference/control/#for)            | Introduce a for iteration source                              |
| [`is`](/reference/control/)                | Match a compatible type in a pattern                          |
| [`let`](/reference/bindings/)              | Declare an immutable runtime variable                         |
| [`match`](/reference/control/)             | Select a branch using exhaustive patterns                     |
| [`nullptr`](/reference/pointers/)          | Null pointer literal                                          |
| [`private`](/reference/modules/)           | Restrict module declarations or class operations              |
| [`rethrow`](/reference/failures/)          | Rethrow the failure currently being handled                   |
| [`return`](/reference/control/#return)     | Return from the current function or lambda                    |
| [`struct`](/reference/aggregates/)         | Declare a value structure with named fields                   |
| [`test`](/reference/entry-testing/)        | Declare a runtime or compile-time test                        |
| [`throw`](/reference/failures/)            | Raise a failure or declare a function failure contract        |
| [`true`](/reference/lexical/)              | Boolean true literal                                          |
| [`try`](/reference/failures/)              | Establish failure recovery or produce a recovered result      |
| [`using`](/reference/modules/)             | Select imported names                                         |
| [`var`](/reference/bindings/)              | Declare a mutable runtime variable                            |
| [`while`](/reference/control/#while)       | Execute a conditional or conditionless loop                   |

## Contextual keyword self

`self` is an identifier token. As the first parameter name of a class operation, it selects a receiver and must have no type annotation: `self` is Read, `&self` is Write, and `&&self` is Take. `fn read(self: Counter)` is rejected, as is `self` in a later class-operation parameter position. Outside that parameter list, ordinary bindings such as `let self = 2;` and free-function parameters such as `fn echo(self: i32) -> i32 => self;` are valid. See [value classes](/reference/aggregates/#ordinary-value-classes).

```carven
class Counter {
    value: i32,
    fn create(value: i32) -> Counter => { value: value };
    fn read(self) -> i32 => self.value;
}

let counter = Counter::create(3);
println(counter.read()); // 3
```

## Other special spellings

| Spelling                                         | Where it is special                                                          | Outside that position                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| `cpp`                                            | `import(cpp)`, `export(cpp)`, and the exact `#[cpp]` fragment marker         | Ordinary identifier, such as `let cpp = 3;`              |
| `r`, `f`, `c`                                    | Adjacent raw, interpolated, and C string prefixes                            | Ordinary identifiers; whitespace breaks prefix adjacency |
| `_`                                              | Discard bindings and wildcard patterns                                       | No referenceable discard variable; `_name` is ordinary   |
| `i32`, `String`, and other builtin type names    | Builtin types in type positions; module declaration names may not reuse them | Local value names are permitted, such as `let i32 = 3;`  |
| `ptr`, `range`                                   | Pointer syntax `ptr<T>` and the unqualified integer-range type `range<T>`    | Ordinary value names, such as `let range = 3;`           |
| `println`, `assert`, and other builtin callables | Ordinary lookup finds the builtin when no nearer declaration shadows it      | May be shadowed by ordinary declarations                 |

At a type position, `ptr` requires `<...>` immediately in its type form: an ordinary value binding called `ptr` does not make `ptr` a standalone type.

These mechanisms differ: contextual syntax does not imply global reservation, and an identifier token does not guarantee that every declaration position admits its spelling. There is no escaped-identifier syntax for using `if` as a variable name. `new`, `delete`, and `static` remain ordinary identifiers.

## Keyword combinations

A keyword may participate in several forms. This table links each combination to its rules.

| Spelling                             | Rules                                                        |
| ------------------------------------ | ------------------------------------------------------------ |
| `const name = ...`                   | [Constant declarations](/reference/bindings/#const)          |
| `const fn`                           | [Compile-time functions](/reference/constants/#const-fn)     |
| `const name: T` (function parameter) | [Static parameters](/reference/functions/#static-parameters) |
| `const if` / `const for`             | [Static control](/reference/functions/#static-control)       |
| `const { ... }`                      | [Constant blocks](/reference/constants/#constant-blocks)     |
| `const test`                         | [Compile-time tests](/reference/entry-testing/#const-test)   |
| `import(cpp)` / `export(cpp)`        | [Native function boundaries](/reference/interop/)            |

## Builtin names and syntax symbols

The nine global builtin callables are `print`, `println`, `eprint`, `eprintln`, `assert`, `check`, `require`, `fail`, and `addressof`. Signatures and behavior are in the [builtin API reference](/reference/builtins/).

`&`, `&&`, `?`, `=>`, `..`, and `..=` are syntax symbols, not keywords. Their rules are in [access and ownership](/reference/ownership/), [failure contracts](/reference/failures/), [functions](/reference/functions/), and [operators](/reference/operators/). See [types and conversions](/reference/types/) for type spellings and available types.
