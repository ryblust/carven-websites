---
title: "Evaluation, control flow, and patterns"
description: "Operator domains, short-circuiting, loops, value branches, pattern bindings, and exhaustiveness."
section: reference
lesson: 7
source: docs/language/control-flow.md
---

## Operator domains

! requires `bool`; numeric negation requires a number; ~ requires an integer. Arithmetic and ordering require the same numeric type. Remainder, bitwise operations, and shifts require integers. Logical &&/|| require `bool` and short-circuit left to right. External C++ operands follow native operation rules.

Equality supports `bool`, `char`, integers, floating point, `str`, `String`, arrays with comparable elements, numeric enums, payload enums with comparable payloads, and pointers with the same target type. Structures and classes do not support `==` or `!=`; unsupported comparison reports `CV-TYPE-EQUALITY-UNSUPPORTED`. Callables, entry arguments, slices, integer ranges, and chars ranges have no equality. Floating equality follows IEEE; `!=` is its negation. `0.0` and `-0.0` are the same literal pattern. [SIMD comparisons](/reference/simd/#operators-and-masks) produce masks.

## Order and inactive code

The callee precedes arguments; the left operand precedes the right; the receiver precedes the index; the assignment target precedes its right side. Initializers follow written source order. Every operand on a selected evaluation path runs once. Failure immediately skips the rest of that path.

Every source operand and branch receives operation, result-compatibility, and failure-consumption checks, including after a terminal statement. Only source after a terminal statement contributes no runtime evaluation, outward failure, ownership transition, or reachable-use evidence. A nonreturning expression may appear where its type is known; a call still needs a callable type and match still needs a subject type.

A condition’s value never changes analysis. Reachability, failures, ownership, pointer proofs, and returns consider every branch of ordinary `if`, `&&`, `||`, `match`, and conditional loops, whether a condition is a literal, a `const`, or a runtime value. `if false` and `while true` retain both analysis paths. Only a conditionless `while { ... }` is known not to end by itself; it exits through `break`. [Static control](/reference/functions/#static-control) explicitly selects specialization and generation while all source arms remain checked.

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

This prints 1 through 4. An expected `range<T>` supplies T to both bounds. Without one, the bounds follow the binary-operand rule in [expected types](/reference/types/#expected-types): a direct unsuffixed literal takes its type from the other bound, so `0..text.len()` is `range<usize>`. Otherwise the first bound establishes the type and the second is checked against it; incompatible bounds report `CV-TYPE-RANGE-BOUNDS`. Ordinary expression forms require both bounds; omitted bounds are only for patterns. There is no step or implicit reverse traversal.

## if and loops

if conditions, while conditions, and guards require `bool`. A value-producing if needs else and compatible normally completing branch results. Value branches of if, match, and try receive the surrounding expected type, so a branch result may be a [contextual construction](/reference/aggregates/#contextual-construction); in match and catch arms, write `({})` for an empty one. Statement forms produce no value.

```carven
let amount = if true { 10 } else { 20 };
```

while checks its condition before each iteration; `while { ... }` repeats until break. A C-style for creates a loop scope, initializes once, checks its required condition, executes the body, then executes steps in written order. continue enters the step; break exits.

An integer-range loop snapshots its source once. Reassigning the source range or changing its original bounds during iteration does not change the sequence. Traversal is ascending: reversed ranges are empty, equal bounds produce zero elements for `..` and one for `..=`. Closed ranges can include the integer type maximum without overflowing. Integer range bindings cannot be Write. Arrays permit Read and, for mutable sources, Write iteration; slices and chars permit only Read.

Range bindings cannot be Taken, and their names are not visible in their own types or range sources. Array iteration retains access to the source owner until exit, preventing Take of the whole array during iteration. Writing one element does not restore an unavailable whole array. A loop accesses an element only after validating the cursor; its end check does not read out of bounds.

## Transfer boundaries of value branches

return targets the current function or lambda; break/continue target loops. Result branches of value-form if/match/try cannot return to an outer function or break/continue an outer loop. A loop created inside a branch may receive its own transfers. A constant block has the same boundary. Violations produce `CV-FLOW-TRANSFER-BOUNDARY`.

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

For example, `..0`, `0..=100`, and `101..` cover all `i32` values without a wildcard. Removing the last interval makes that match incomplete; guards do not fill the gap.
