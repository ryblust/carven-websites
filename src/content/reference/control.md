---
title: "Evaluation, control flow, and patterns"
description: "Operator domains, short-circuiting, loops, value branches, pattern bindings, and exhaustiveness."
section: reference
lesson: 11
source: docs/semantics.md
---

## Operator domains

! requires bool; numeric negation requires a number; ~ requires an integer. Arithmetic and ordering require the same numeric type. Remainder, bitwise operations, and shifts require integers. Logical &&/|| require bool and short-circuit left to right. External C++ operands follow native operation rules.

Equality supports bool, char, integers, floating point, str, String, memberwise comparable arrays/structs/enums, and pointers with the same target type. Callables, entry arguments, slices, and chars ranges do not support equality. Floating equality follows IEEE and != is its negation. `0.0` and `-0.0` are the same literal pattern.

## Order and inactive code

The callee precedes arguments; the left operand precedes the right; the receiver precedes the index; the assignment target precedes its right side. Initializers follow written source order. Every operand on a selected evaluation path runs once. Failure immediately skips the rest of that path.

All source branches, including code after terminating statements or branches proven inactive by constants, still undergo operation, result-compatibility, and failure-consumption checks. Proven inactive paths do not contribute escaping failures, ownership transfers, or reachable-use evidence. A nonreturning expression may appear where its type is known; a call must still establish a callable type and match must still establish a subject type.

## if and loops

if conditions, while conditions, and guards require bool. A value-producing if needs else and compatible normally completing branch results. Statement forms produce no value.

```carven
let amount = if true { 10 } else { 20 };
```

while checks its condition before each body execution. A C-style for creates a loop scope, initializes once, checks its condition, executes the body, then executes steps in written order. An omitted condition is true. continue enters the step; break exits.

Integer range `begin..end` evaluates its compatible integer endpoints once and traverses an increasing half-open interval. begin at least end means empty. Integer range bindings cannot be Write. Arrays permit Read and, for mutable sources, Write iteration; slices and chars permit only Read.

Range bindings cannot be Taken, and their names are not visible in their own types or range sources. Array iteration retains access to the source owner until exit, preventing Take of the whole array during iteration. Writing one element does not restore an unavailable whole array. A loop accesses an element only after validating the cursor; its end check does not read out of bounds.

## Transfer boundaries of value branches

return targets the current function or lambda; break/continue target loops. Result branches of value-form if/match/try cannot return to an outer function or break/continue an outer loop. A loop created inside a branch may receive its own transfers. Violations produce `CV-FLOW-TRANSFER-VALUE-BRANCH`.

## match and patterns

Both statement and value match must be exhaustive; value match also requires compatible results. The subject evaluates once. An rvalue subject survives guard rejection. For storage subjects, receiver and index are selected once and remain stable through matching.

```carven
enum Reply {
    Empty,
    Number(i32),
}

fn unpack(reply: Reply) -> i32 {
    return match reply {
        .Empty => 0,
        .Number(value) if value > 0 => value,
        .Number(_) => -1,
    };
}
```

Select the first arm in source order whose pattern matches and guard passes. Guards may modify other storage, call functions, and fail. They cannot obtain Write/Take access to overlapping subject storage through direct access, aliases, or captures. A selected arm body may modify the subject.

Patterns support recursive enum cases, literals, bindings, _, `is T`, and |. There is no struct/array destructuring. Payload counts must match exactly. A bare identifier creates an immutable owner; it never means equality with a same-named constant. Payloads copy once after case matching and before the guard.

`is T` requires an already compatible canonical subject type and covers that type under this constraint. Alternatives must bind the same names with the same types, without duplicate bindings within an alternative. Guards use established bindings but do not contribute ordinary match exhaustiveness coverage.

Repeated or subsumed alternatives within one or-pattern are errors. An arm fully covered by preceding unguarded arms gets `CV-FLOW-UNREACHABLE-MATCH-ARM`; its source is still checked but it does not participate in runtime selection. Missing cases are described with a deterministic shortest witness.
