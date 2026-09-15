---
title: "Typed failure contracts"
description: "Failure sets, explicit upper bounds, inference, propagation targets, partial catches, guards, and rethrow."
section: reference
lesson: 12
source: docs/semantics.md
---

## Failure types and interfaces

A failure is a recoverable control effect with a payload. Payload types are copyable nominal structs or enums. A contract is a closed type set; spelling order and declaration order do not affect identity. Explicit `throw E + E` is invalid.

```carven
struct ReadError {
    code: i32,
}

struct ParseError {
    offset: usize,
}

fn load() -> i32 throw ReadError + ParseError {
    return 42;
}
```

An explicit throw clause bounds the body's failure set. Calls to load always use its declared set, even if the current body always succeeds. Callers do not look through an interface to narrow that set.

Module-private non-entry functions and lambdas without contracts infer a least fixed point across forward calls, direct recursion, and mutual recursion. Bare and export functions with nonempty actual failures must declare them, or receive `CV-EFFECT-THROW-PUBLISHED`. An entry that propagates failures outward needs an explicit contract regardless of visibility. Tests cannot expose escaping failures. Failure types must be visible to interface readers.

## `?` and `throw`

An expression with pending failures cannot be consumed directly as an ordinary completed value. Postfix ? transfers its operand's failures to the nearest enclosing failure target at that lexical position, preserving the success result on success. It can apply to a call or compound expression.

```carven
fn sum() -> i32 throw ReadError + ParseError {
    return (load() + load())?;
}
```

If the first load fails, the second and the addition are skipped. Pending failures are a static composition fact, not a delay of runtime checking until every computation finishes. Applying ? to an empty failure set produces `CV-EFFECT-PROPAGATE-REDUNDANT`. If a private function becomes inferred as nonfallible, callers must remove the old ?.

`throw value;` transfers a payload and does not complete normally. It copies by default; explicit Take follows ordinary owner-availability rules. Completed mutations and external operations remain, without automatic rollback.

## Partial catches and residual sets

try handles failures from its protected body. catch supports type, wildcard, alternative, payload, and guarded patterns. Uncovered failures go to the outer target.

An outer protected body, lambda, inferred private non-entry function, or function with an explicit throw contract may accept residual failures. At a test boundary or a published/entry function without an explicit contract, every protected-body failure must be covered. The final outward set is always checked against the enclosing callable contract.

```carven
struct A {}
struct B {}

fn source() throw A + B {}

fn wrapper() throw B {
    try {
        source()?;
    } catch {
        A(_) => {},
    }
}
```

This program handles A and retains B outward. To spell the remaining propagation explicitly, use the following wrapper with the same A, B, and source declarations:

```carven
fn wrapper() throw B {
    try {
        source()?;
    } catch {
        A(_) => {},
        _ => rethrow,
    }
}
```

Choose one of the two wrapper definitions; they have the same outward set. A type is removed from the residual set only when the arms collectively cover all its possible values, accounting for guard rejection. A try with a nonfallible protected body is valid and receives no redundancy diagnostic.

## Selection order and guards

Catch order is observable. Alternatives within an arm form one or-pattern. The first matching alternative establishes bindings, then the guard runs once. A false guard advances to the next arm rather than retrying another alternative in the same arm.

Failures from guards or handlers go to the outer target and are not caught again by the same try. Unreachable or type-impossible handlers do not contribute reachable outward failures, but their source is still checked. Nonexhaustive diagnostics list types not fully covered, including partial payload coverage and possibly rejecting guards.

## rethrow and lifetimes

rethrow is valid only inside a catch handler. It forwards that handler's selected original failure identity and accepts no replacement payload. To translate a failure, use `throw NewError { ... };`. A closure does not inherit an outer catch's control context.

The original payload retains its borrows independently of copied catch bindings through selection, guards, and rethrow. Local cleanup must not destroy backing still referenced by a failure payload. A handler can copy borrowed text into an independent String before returning.

C++ exceptions are not members of failure sets, and try does not catch them. An exception escaping a generated noexcept boundary terminates according to C++ rules. A native adapter must handle exceptions before that boundary when recovery is required.
