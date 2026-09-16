---
title: "Evaluation, control flow, and patterns"
description: "Operator domains, short-circuiting, loops, value branches, pattern bindings, and exhaustiveness."
section: reference
lesson: 7
source: docs/semantics.md
---

## Operator domains

! requires bool; numeric negation requires a number; ~ requires an integer. Arithmetic and ordering require the same numeric type. Remainder, bitwise operations, and shifts require integers. Logical &&/|| require bool and short-circuit left to right. External C++ operands follow native operation rules.

Equality supports bool, char, integers, floating point, str, String, memberwise comparable arrays/structs/enums, and pointers with the same target type. Callables, entry arguments, slices, integer ranges, and chars ranges do not support equality. Floating equality follows IEEE and != is its negation. `0.0` and `-0.0` are the same literal pattern.

## Order and inactive code

The callee precedes arguments; the left operand precedes the right; the receiver precedes the index; the assignment target precedes its right side. Initializers follow written source order. Every operand on a selected evaluation path runs once. Failure immediately skips the rest of that path.

All source branches, including code after terminating statements or branches proven inactive by constants, still undergo operation, result-compatibility, and failure-consumption checks. Proven inactive paths do not contribute escaping failures, ownership transfers, or reachable-use evidence. A nonreturning expression may appear where its type is known; a call must still establish a callable type and match must still establish a subject type.

## Integer range values

`begin..end` excludes the upper bound; `begin..=end` includes it. Both expressions have type `range<T>` for one compatible builtin integer type T. Bounds evaluate once, left to right, and their values are copied into the range. A range owns no element storage and does not borrow its bound expressions. It supports storage, copying, parameters, returns, and constant execution.

```carven
var end = 4;
let values: range<i32> = 1..=end;
end = 8;
for value in values {
    println(value);
}
```

This prints 1 through 4. An expected `range<T>` supplies T to the first bound; otherwise that bound establishes the type. The second bound is checked against it. Ordinary expression forms require both bounds; omitted bounds are only for patterns. There is no step or implicit reverse traversal.

## if and loops

if conditions, while conditions, and guards require bool. A value-producing if needs else and compatible normally completing branch results. Statement forms produce no value.

```carven
let amount = if true { 10 } else { 20 };
```

while checks its condition before each body execution. A C-style for creates a loop scope, initializes once, checks its condition, executes the body, then executes steps in written order. An omitted condition is true. continue enters the step; break exits.

An integer-range loop snapshots its source once. Reassigning the source range or changing its original bounds during iteration does not change the sequence. Traversal is ascending: reversed ranges are empty, equal bounds produce zero elements for `..` and one for `..=`. Closed ranges can include the integer type maximum without overflowing. Integer range bindings cannot be Write. Arrays permit Read and, for mutable sources, Write iteration; slices and chars permit only Read.

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

Patterns support recursive enum cases, integer ranges, literals, bindings, _, `is T`, and |. There is no struct/array destructuring. Payload counts must match exactly. A bare identifier creates an immutable owner; it never means equality with a same-named constant. Payloads copy once after case matching and before the guard.

`is T` requires an already compatible canonical subject type and covers that type under this constraint. Alternatives must bind the same names with the same types, without duplicate bindings within an alternative. Guards use established bindings but do not contribute ordinary match exhaustiveness coverage.

Repeated or subsumed alternatives within one or-pattern are errors. An arm fully covered by preceding unguarded arms gets `CV-FLOW-UNREACHABLE-MATCH-ARM`; its source is still checked but it does not participate in runtime selection. Missing cases are described with a deterministic shortest witness.

## Integer range patterns

Integer subjects and integer enum payloads accept `a..b`, `a..=b`, `..b`, `..=b`, and `a..`. The omitted side extends to the corresponding end of the subject type's domain. Present bounds use the subject's integer type. Empty and reversed intervals never match.

```carven
fn inside(value: i32, low: i32, high: i32) -> bool {
    return match value {
        low..=high => true,
        _ => false,
    };
}
```

Here low and high are runtime bounds, so `_` supplies the remaining coverage. Only directly known, execution-free bounds contribute to static coverage; dynamic bounds do not prove exhaustiveness. Even a known result retains its bound evaluation when that evaluation has effects.

Bounds execute left to right, once each, only when their pattern is attempted and before containment is tested. A rejected enum case, an earlier rejected payload, or a successful earlier or-pattern alternative skips later bounds. A bound failure propagates out of matching; it does not simply reject the arm. Bounds cannot obtain Write/Take access to the subject or refer to bindings introduced by the same pattern. Recursive range patterns also work in catch payloads.

For example, `..0`, `0..=100`, and `101..` cover all i32 values without a wildcard. Removing the last interval makes that match incomplete; guards do not fill the gap.
