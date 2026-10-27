---
title: "Language design choices"
description: "Use context to infer types while keeping access, ownership, failures, and execution explicit."
section: philosophy
source: docs/development/principles.md
---

## Express the program's choices

When you parse configuration, process records, or start asynchronous work, the program needs to say who owns the data, how a failure is handled, and when work runs. Carven gives these choices direct source forms. The compiler uses the resulting facts to check the program and choose its C++ implementation.

Types and local context fill in information that would otherwise repeat in source. Access changes, ownership transfers, captures, and failure handling remain visible. The following examples show where context supplies an answer and where you write the choice yourself.

## Give syntax and names defined roles

A class operation can infer its receiver type from the enclosing class:

```carven run
class Counter {
    value: i32,
    fn create(value: i32) -> Counter => { value: value };
    fn read(self) -> i32 => self.value;
}

let self = 4;
let cpp = Counter::create(self);
println(cpp.read()); // 4
```

In the first parameter of `read`, `self` selects a receiver without a type annotation. In `let self = 4`, it is an ordinary name. `create` has no receiver, so the call uses `Counter::create`.

A contextual spelling has a role in a particular grammatical position. A built-in operation has compiler-defined semantics and is found through name lookup. The [keyword reference](/reference/keywords/) collects the reservation and shadowing rules; [built-in capabilities and runtime support](/internals/runtime-boundary/) explains module ownership and visibility.

## Let context supply a type

A declaration, parameter, return type, or destination field can supply an expression's expected type:

```carven run
enum State { Ready, Busy }
let state: State = .Ready;
assert(state == .Ready);

let count: usize = 3;
let next = 1 + count;
println(next); // 4
```

`State` identifies the enum for `.Ready`. In `1 + count`, the direct unsuffixed literal `1` is checked as `usize`. If `1` had first been stored in an unannotated binding, that binding would already be `i32`; a later use would keep its type.

Use an annotation when the surrounding expression supplies insufficient information. Established bindings retain their types. The [type reference](/reference/types/) gives the literal and conversion rules.

## Infer generic arguments from the interface

A generic function such as `fn relay<T>(&&value: T) -> T` can transfer a value using only the capabilities declared by its interface. Calls infer generic arguments from that interface and local type context, so checking a caller does not depend on inspecting the generic implementation. See [parameterized functions](/reference/functions/#parameterized-functions) for inference and body-checking rules.

## Write access and transfer choices

Write access uses `&`; ownership transfer uses `&&`; closure captures are explicit. These markers let a reader identify changes to shared storage and ownership at the call site. The [ownership tutorial](/learn/ownership/) develops function interfaces around those choices; the [reference](/reference/ownership/) defines copying and borrow lifetimes.

## Keep a concrete closure when it owns state

An inferred result can retain a closure and its copied capture. No callable wrapper type is needed:

```carven run
const fn shifted(offset: i32) => [offset](value: i32) => value + offset;

const { assert(shifted(2)(40) == 42); }

let add = shifted(2);
let copy = add;
println(copy(40)); // 42
```

`offset` is captured by value. `add` owns that capture, and `copy` owns an independent copy. An explicit `fn(i32) -> i32` annotation would instead request a borrowed callable view. Both static execution and interpretation support these source closures.

## Keep recovery and execution explicit

`?` marks failure propagation, and `try` places recovery where the caller has enough information to act. [Failure contracts](/features/failure-contracts/) follows a parser through propagation and translation.

A `const` initializer explicitly requests compile-time work; an ordinary function call stays at runtime. [Compile-time computation](/features/compile-time/) uses that distinction to prepare a JSON template and apply runtime settings.

Async syntax makes work and its scope visible. The [async tutorial](/learn/async/) shows how to start work, collect results, and close children; the [language-server tutorial](/learn/lsp/) applies that flow to message processing and shutdown.

## Use semantic facts in native generation

Known types, access, lifetimes, and static values guide parameter passing, storage, result construction, and specialization. Generated code preserves required evaluation, effects, failures, and cleanup. C++ then checks delegated native operations, optimizes, and produces machine code.

[C++ generation and native integration](/features/cpp-generation/) shows the resulting interfaces and native build.
