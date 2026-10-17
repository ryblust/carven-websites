---
title: "What Carven infers and what you write"
description: "Understand contextual names, expected types, explicit access, and where inference stops."
section: internals
source: docs/language/grammar.md
---

## Give each spelling a defined role

Why can a local variable be called `self`, while `fn` cannot be a variable name? Why can `.Ready` omit its enum type, while a Write argument still needs `&`? Carven treats syntax, name lookup, and type inference as different steps.

Start with a contextual name:

```carven
class Counter {
    value: i32,
    fn create(value: i32) -> Counter => { value: value };
    fn read(self) -> i32 => self.value;
}

let self = 4;
let cpp = Counter::create(self);
println(cpp.read()); // 4
```

Inside the class operation's first parameter, `self` names the receiver and gets its type from the enclosing class. In `let self = 4`, it is an ordinary local name. The associated `create` operation has no receiver and is called through `Counter::create`.

Other spellings follow equally specific rules:

| Form                             | What selects its meaning                                               |
| -------------------------------- | ---------------------------------------------------------------------- |
| `fn`, `async`, `await`, `cancel` | Reserved syntax tokens; ordinary bindings cannot use them              |
| `self`, `&self`, `&&self`        | First, untyped class-operation parameter selects receiver access       |
| `cpp`                            | Selects a native boundary in `import(cpp)`, `export(cpp)`, or `#[cpp]` |
| `ptr<T>`                         | Structural pointer syntax in type position                             |
| `r`, `f`, `c`                    | A prefix only when adjacent to its string delimiter                    |
| `println`, `assert`, `when_all`  | Ordinary name lookup, with the required default binding or import      |
| `i32`, `String`, `Vector`        | Standard type declarations selected through ordinary lookup            |

Module paths and qualified name components have their own accepted token forms. The [keyword reference](/reference/keywords/) collects the reservation and shadowing rules.

## Let context fill in a type, within a boundary

A declaration, parameter, return type, or destination field can supply the expected type of an expression. This is enough to select an enum case or a numeric literal without repeating its type:

```carven
enum State { Ready, Busy }
let state: State = .Ready;
assert(state == .Ready);

let count: usize = 3;
let next = 1 + count;
println(next); // 4
```

`State` supplies the type of `.Ready`. In `1 + count`, the direct unsuffixed literal `1` is checked as `usize`, matching count. If that literal had first been stored in an unannotated binding, the binding would already be `i32`; using it later would not revise its type.

This makes inference predictable: the surrounding expression supplies defined evidence, and established bindings keep their types. Use an annotation when the available context is insufficient. The [type reference](/reference/types/) defines the detailed literal and conversion rules, including the separate conversions delegated to C++.

## Keep behavior-changing choices visible

A type can tell the compiler what kind of value is expected. It does not decide whether the caller should lend mutable storage or give the value away. A Write argument therefore repeats `&`, a Take argument repeats `&&`, and closure captures remain explicit. A named return copies; `return &&owner` transfers.

Calls evaluate the callee and runtime arguments once, from left to right. Read values that retain an owner's storage can observe changes made through an admitted Write alias. An explicit owning copy creates separate contents, while any views inside it keep their original relationships. The [ownership reference](/reference/ownership/) explains those lifetimes.

Failure choices are visible too: `?` propagates and `try` establishes recovery. Recovery preserves changes already made. A workflow that needs rollback must implement it.

## Separate permission from execution stage

`const fn` makes a function available for compile-time execution. A `const` initializer, block, or static test selects that stage; ordinary calls remain at runtime. A `const` parameter fixes one input for specialization while other inputs remain runtime values.

`const if` selects the generated branch. Every source branch still receives type, access, ownership, and failure checks. The [compile-time article](/features/compile-time/) shows how this prepares data and runtime work.

## Make asynchronous execution visible

An async call creates a cold operation: a value describing work that has not started. Its `Operation<T, throw E>` type records the successful result `T` and failures `E`. `await` starts or observes the operation, `async let` starts a child owned by the current scope, and `cancel child` requests cancellation.

`when_all` returns results as a tuple in input order. A selection operation requires a common successful result type. Closing children waits for their work and cleanup before releasing borrowed data. The [scope example](/playground/#example=async-scope) shows why requesting cancellation alone is insufficient.

Names such as `when_all`, `yield_once`, and `close` require imports and use ordinary lookup. A duration literal such as `100ms` can construct a checked duration without importing its type name; an explicit `Duration` annotation does require the import. See [async](/reference/async/), [time](/reference/time/), and [modules](/reference/modules/) for the full rules.

## Infer generic shape from the interface

A generic function such as `fn relay<T>(&&value: T) -> T` can transfer a value without assuming that an unknown `T` can be copied, compared, default-constructed, or formatted. Its body is checked against those limits even when unused. Type parameters and failure-set parameters represent different kinds of information.

At a call, inference uses the declared parameter shapes, actual argument types, and immediate expected result. An `Operation<T, throw E>` can provide evidence for both the result type and the failure set. If the evidence is ambiguous, write explicit arguments. The compiler does not inspect a generic body or earlier calls to guess a missing type.
