---
title: "Failure contracts"
description: "Failure sets, explicit upper bounds, inference, propagation targets, partial catches, guards, and rethrow."
section: reference
lesson: 7
source: docs/language/failures.md
---

## Failure types and interfaces

A function can either return its normal result or report a recoverable failure, such as invalid input. The `throw` clause lists the failure types callers must handle. A caller can use `?` to pass a failure outward or `try`/`catch` to recover.

Each failure carries a value of a declared struct or enum type. That value must support copying; integers and strings alone are not failure types. A concrete failure contract lists a fixed set of types. Their order in the clause or source does not change the set. An explicit clause
may name each nominal failure type only once; `throw Error + Error` is invalid.
`throw ()` declares the empty set. It is an explicit contract, rather than an
omitted contract requesting inference. In a value or type position, `()` denotes
the `void` unit instead; an empty failure set has no payload. `throw void` is
invalid because `void` is not a nominal failure type. A callable may therefore
return the unit value while declaring no failures:

```carven
fn finish() -> void throw () => ();
```

A function body may produce fewer failure types than its explicit throw clause allows, but never more. Module-private
non-entry functions, implicit entries, and lambdas that omit it infer the least
fixed-point failure
set across forward calls, direct recursion, and mutual recursion. A published
function—bare or exported—with a nonempty actual set must state an explicit
`throw` contract;
omitting it produces `CV-EFFECT-THROW-PUBLISHED`. Explicit entry functions also
require an explicit `throw` contract for outward failures, regardless of
declaration visibility. Tests must handle every failure and cannot expose a
failure contract. Failure types in a published contract must be visible to that
contract's audience.

The same Copy requirement applies to function and callable failure clauses,
`Operation<T, throw E>` members, thrown payloads, and typed catch alternatives.
It is checked after nominal fields are complete, including nested fields and
enum payloads. A nominal value that owns an `Operation` cannot be a failure
payload. Empty arrays retain their ordinary Copy rule, and native C++ fields
retain the existing delegated Copy boundary. Moving a payload into `throw`
does not remove the requirement that its failure type be copyable.

Calls use the callee's failure contract. An explicit contract determines the
call's failure set even when the callee's body produces fewer failures:
`fn source() throw Error {}` still makes `source()` fallible with type `Error`.

Known functions adapted to callable views follow the [known-target rules](/reference/closures/#known-function-targets).

## Failure-set parameters

A generic declaration can bind a scalar failure-set parameter with `throw E`.
It represents a finite set of copyable nominal failure types, including the
empty set. It is neither a payload type nor a value parameter. Type and
failure-set arguments occupy distinct positions in the declaration:

```carven
import std::async using Operation;

async fn consume<T, throw E>(&&operation: Operation<T, throw E>) -> T throw E {
    return (await operation)?;
}
```

An explicit application can supply `throw Error + IO` or `throw ()` for `E`.
A parameter can appear in a callable's `throw` clause or an Operation contract,
alone or in a union such as `E + Error`. An application normalizes that union as
a set: a member contributed by both `E` and `Error` appears once. Functions infer
omitted arguments from their public signature, actual argument types, and immediate
expected result. A whole `Operation<T, throw E>` can determine `E`; an ambiguous
union such as `E + Error` requires explicit arguments. Nominal applications require
explicit arguments.

The definition must satisfy its failure contract for every admitted set assigned
to each parameter. It cannot assume that `E` contains a particular type, that two
independent parameters are equal, or that `E` is nonempty. Unmarked pending
failures must be provably empty; propagated failures must be provably within the
enclosing contract. A safe concrete application cannot validate an unsafe
definition. These safety checks belong to the definition and are not repeated
as new source checks in each instance.

Typed catches still name nominal payload types. Catching all values of `Error`
removes that type from the protected failure set, including when the set depends
on `E`; unhandled members retain their parameter dependency. A payload cannot
be constructed, thrown, or selected by naming `E` itself. Existing guard,
rethrow, and payload-lifetime rules apply.

A `?` whose operand has a parameter-dependent failure set is valid when that set
can be nonempty. If a concrete application makes it empty, the operand still
evaluates once and propagation has no failure to transfer. This does not admit
`?` on an operand already proved infallible when the definition is checked.

## `?` and `throw`

Report a failure with `throw`, then propagate it with `?` or handle it with `try`/`catch`:

```carven run
struct Missing { key: String }

fn lookup(key: str) -> i32 throw Missing {
    if key == "answer" {
        return 42;
    }
    throw Missing { key: key as String };
}

let answer = try {
    lookup("other")?
} catch {
    Missing(_) => 0,
};
println(answer); // 0
```

A value with pending failures cannot be consumed where an ordinary completed
value is required. Postfix `?` consumes the pending failures of its operand at
that lexical position and transfers them to the nearest enclosing failure
target. The operand may be a call or a composite expression whose selected
evaluation path carries pending failures. Applying `?` to an operand whose
failure set is proved empty is invalid, subject to the parameter-dependent rule
above. `throw` transfers the supplied failure and does not complete
normally.

For an ordinary concrete operand, the nonempty requirement for `?` is checked
against the solved failure set. For `private fn source() {}`, `source()?` is invalid
because the inferred set is empty; write the call as `source()`.

The compiler tracks failures through the whole expression. Execution stops at the first failure: in `(first() + second())?`, a failure from `first()` skips
`second()` and the addition. Operands evaluate left to right, exactly once,
along the selected path.

Failure propagation does not roll back completed mutations or external effects.

Carven failures are independent of C++ exceptions. Native exceptions must be
handled in C++ before they escape a generated `noexcept` boundary to continue
execution.

## Partial catches and residual sets

`try` handles failures produced by its protected body. Catch arms may select a
failure type, wildcard, alternatives, payload patterns, and guards. Remaining
failures transfer to the enclosing failure target. The remaining failures can pass to an outer try body. They can also pass to a lambda, private non-entry function, or implicit entry with inferred failures. A function with an explicit throw contract can accept them when that contract includes their types. At a test boundary or a published or explicit entry function
without an explicit contract, catch arms must
cover every protected failure. Outward failures remain subject to the enclosing
callable's contract.

For example, this handler consumes `A` and forwards `B`:

```carven
struct A {}
struct B {}
fn source(select_a: bool) throw A + B {
    if select_a {
        throw A {};
    }
    throw B {};
}

fn wrapper(select_a: bool) throw B {
    try {
        source(select_a)?;
    } catch {
        A(_) => {},
    }
}
```

Adding `_ => rethrow,` after the `A` arm explicitly forwards the remaining
failure and gives the same outward set, `{B}`. A failure type remains in the
set unless the arms collectively cover all its values, accounting for guards
that may reject.

Failures produced by a guard or handler propagate to the enclosing failure
target and are never caught again by the same `try`. Alternatives in one arm
form one or-pattern. The first matching alternative establishes its bindings,
then the arm guard runs once. A false
guard continues with the next arm. Catch-arm order remains observable even
though failure-set member order does not. A non-exhaustive catch diagnostic
identifies each failure type that is not fully covered, including partial payload
patterns and guards that may reject. A test that leaves failures unhandled and a
callable body that exceeds its `throw` contract name the failure types and the
nearest `?` operands that propagate them. A `try` around an infallible body is valid
and produces no diagnostic.

## rethrow and lifetimes

`rethrow` is valid only within a catch handler and transfers the caught failure
identity selected for that handler. Closure bodies are separate callable
boundaries: their failures and control transfers do not belong to evaluation of
the expression that creates the closure.

The original payload retains its backing relationships through selection, guards, and rethrow. Borrowed storage must remain alive while the failure payload refers to it.

Catch pattern bindings are not owners and cannot be taken directly. To transfer a selected payload, copy it into a local owner with `let owned = error;`, then use `&&owned`. Taking that copy does not consume the original failure retained for `rethrow`.
