---
title: "Bindings, access, ownership, and cleanup"
description: "Read, Write, Take, copying, restoration, aliasing, temporaries, and scoped cleanup."
section: reference
lesson: 4
source: docs/semantics.md
---

## Bindings and access

| Form                   | Role                                           |
| ---------------------- | ---------------------------------------------- |
| `let x = value`        | Immutable runtime owner                        |
| `var x = value`        | Mutable runtime owner                          |
| `const x = expression` | Compile-time name                              |
| `fn f(x: T)`           | Read parameter                                 |
| `fn f(&x: T)`          | Non-owning, nonexclusive Write parameter       |
| `fn f(&&x: T)`         | Immutable Take owner parameter                 |
| `for x in values`      | Read range binding                             |
| `for &x in values`     | Write range binding when the source permits it |

In declarations and calls, &/&& describe access rather than construct general reference types. The & in `ptr<&T>` specifies pointer-target access.

Every binding requires an initializer. `_` creates no symbol, may repeat, and produces no unused warning. A discarded runtime initializer still evaluates; its value is retained until the enclosing scope ends. Local `const _` still requires a constant. Module const must have a name.

A local name enters scope after its type, initializer, and required constant checks complete. A same-named reference in its initializer selects an existing outer binding, not the new binding being declared.

Arguments repeat declared access exactly: `read(x)`, `write(&x)`, `take(&&x)`. Write permits multiple parameters to alias one mutable owner; mutations occur in body order. Write permits mutation without promising it occurs. Read cannot modify the current parameter storage, but internal pointers and Write captures retain their own target permissions.

## Read values and aliases

Carven arrays, String, closures, and aggregates containing those storage forms retain storage through const references. Other types, including native types, use const values when C++ copy construction and destruction are both trivial; otherwise they use const references. Declared import(cpp)/export(cpp) functions use the same ordinary Read policy.

By-value Read saves a value during argument evaluation. By-reference Read retains selected storage, so later aliased writes affect reads. An explicit owner copy can establish an independent immediate value, while views inside the copy still reference original backing. Take-conflict checks are not omitted based on native Read representation.

## Take and availability

A Take source must be a whole owner or temporary. Runtime let/var, ordinary pattern bindings, and Take parameters are owners. Read/Write parameters, range bindings, capture state, and const cannot be Taken. Individual fields and elements cannot be Taken.

```carven
fn relay(&&value: i32) -> i32 => value;

fn main() {
    var value = 7;
    let moved = &&value;
    value = 9;
    println(moved, value);
}
```

Even for copyable i32, Take makes the original binding unavailable. An && expression preserves the value type; it does not specify a fixed number or particular kind of C++ move operations.

Only an ordinary assignment to a whole var restores availability, after its right side completes normally. Partial assignments, compound assignments, and increment/decrement need the old value. `x = relay(&&x)` restores x on normal return; if the right side fails, x remains unavailable. `x = &&x`, including parenthesized forms, is invalid.

At a control-flow merge, a binding is available only if it is available on all normally continuing paths. Loops include zero-iteration paths and back edges.

## Take and C++ move are different contracts

`&&owner` is not an alias for std::move. C++ [std::move](https://timsong-cpp.github.io/cppwp/n4868/forward) changes an expression's value category so later operations can select move or other valid construction; it does not make the variable name unavailable in the language. Carven Take also changes the source binding's static availability, even for i32.

Replacing Take with std::move in a C++ snippet may preserve successful output without providing the same later-use checks. Equivalent implementations must account separately for value delivery and which subsequent operations are allowed. C++ type design, library contracts, or additional analysis can provide their own constraints.

## Unfinished accesses and conflicts

Take cannot overlap access retained by an unfinished call, including its callee and arguments of enclosing calls. `f(x, &&x)` is invalid. `f(x + 1, &&x)`, or obtaining an independent result before Take, may be valid because that result no longer borrows x.

A Write capture remains active through every live value directly or indirectly holding its closure. Arrays, aggregates, branch results, and later extraction preserve the relationship. While any holder remains, the captured owner cannot be Taken.

## Assignment and lifetimes

Initializing an owner from an existing value copies by default and leaves the source available. Initializing from `&&owner` transfers and changes availability. An independent temporary may be delivered directly to its destination. Copies own immediate fields, elements, and payloads; non-owning contents preserve their referents.

Ordinary assignment uses the destination's C++ assignment operation rather than ending and reconstructing its lifetime. Select the destination first, then evaluate the right side, once each. Numeric compound addition/subtraction/multiplication/division require numeric types; remainder, bitwise operations, and shifts require integers, as do increment/decrement.

Local owners belong to lexical scopes. Normal exit, return, failure, and loop transfers end the corresponding local lifetimes. Temporaries usually belong to full expressions; explicit constructs such as an owning match subject or range-loop source may retain temporary storage. Delivering a result to a long-lived owner does not extend its borrowed backing's lifetime.

Carven has no source-level destructors or general lifetime-extension syntax. Target compilation checks C++ construction, assignment, and destruction requirements. Valid source operations must yield valid target programs when native provider requirements are met.
