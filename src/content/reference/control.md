---
title: Branches, loops, and control transfers
description: Syntax, execution, and restrictions for if, while, for, match, break, continue, and return.
section: reference
lesson: 6
source: docs/language/control-flow.md
---

## Control-flow overview

Control statements select branches, repeat execution, or leave the current flow. `if`, `match`, and `try` can also be value-producing expressions. `while` and `for` are loop statements. Conditions require `bool`, and control bodies are braced.

| Form                                        | Purpose                                                   |
| ------------------------------------------- | --------------------------------------------------------- |
| `if condition { ... } else { ... }`         | Select a branch by condition                              |
| `while condition { ... }`                   | Repeat while a condition is true                          |
| `while { ... }`                             | Repeat until a transfer leaves the loop                   |
| `for value in source { ... }`               | Iterate an integer range, array, slice, or character view |
| `for initializer; condition; steps { ... }` | Loop with initialization and steps                        |
| `match value { ... }`                       | Select a branch by pattern                                |
| `break;` / `continue;`                      | Leave the nearest loop / start its next iteration         |
| `return value;`                             | Return from the current function or lambda                |

[`try` / `catch` and failure propagation](/reference/failures/) have a separate chapter. [`const if` / `const for`](/reference/functions/#static-control) select static specialization.

## if

A statement-form `if` can omit `else`. Conditions are checked in order, and the first true branch executes. If none succeeds, the `else` branch executes when present. Numbers and pointers do not implicitly convert to `bool`.

```carven
let score = 75;
if score >= 90 {
    println("excellent");
} else if score >= 60 {
    println("pass");
} else {
    println("retry");
}
```

This prints `pass`. A value-form `if` requires `else`. Each normally completing branch ends with a compatible result expression, without a semicolon after that expression.

```carven
let score = 75;
let status = if score >= 60 { "pass" } else { "retry" };
println(status); // pass
```

Value branches of `if`, `match`, and `try` receive the surrounding expected type and may produce [contextual constructions](/reference/aggregates/#contextual-construction). Statement forms produce no value. A value branch cannot transfer control to an outer function or loop; see [transfer boundaries](#transfer-boundaries-of-value-branches).

```carven
let result = if true { 1 }; // Compile error: value-form if requires else.
```

## while

`while condition { ... }` checks the condition before each iteration. A false condition ends the loop, possibly without any iteration. `while { ... }` omits the condition and suits flows that explicitly exit inside the body.

```carven
var count = 0;
while count < 3 {
    println(count);
    ++count;
}
```

This prints 0, 1, and 2. A conditionless loop:

```carven
var count = 0;
while {
    if count == 3 {
        break;
    }
    ++count;
}
println(count); // 3
```

Only `while { ... }` is analyzed as not ending by itself. `while true { ... }` retains a condition-exit analysis path.

## for

### Iteration form

`for name in source { ... }` iterates integer ranges, arrays, read-only slices, or text character views. A binding may have a type annotation. Writable arrays permit `for &name in source` to modify elements.

```carven
var values = [1, 2, 3];
for &value in values {
    value *= 2;
}
let view = values.as_slice();
for index in 0..view.len() {
    println(view[index]);
}
```

This prints 2, 4, and 6. The literal `0` receives `usize` from the length operand, so no suffix is needed. `0..3` excludes 3; `0..=3` includes it. Reversed ranges are empty. Equal bounds produce no elements for a half-open range and one for a closed range. Closed ranges may include the integer type's maximum without overflowing at the final step.

An integer-range loop snapshots its range on entry; later changes to the source range or its original bounds do not change the traversal. Integer range bindings cannot be Write. Slices and character views permit only Read. Range bindings cannot be Taken, and their names are not visible in their own type or range source.

Array iteration retains access to the source owner until exit, preventing Take of the whole array during iteration. Writing an element does not restore an unavailable whole array. Elements are accessed only after cursor validity is established, and the end check reads no out-of-bounds element.

### C-style form

```text
for initializer; condition; step1, step2 {
    statements
}
```

The header has no surrounding parentheses. Initialization and steps are optional; the condition is required and must be `bool`. The loop establishes its own scope, initializes once, checks the condition, executes the body, then executes steps in written order.

```carven
var total = 0;
for var index = 0; index < 4; ++index {
    total += index;
}
println(total); // 6
```

Steps admit assignment, prefix increment/decrement, and ordinary expressions; commas separate multiple steps. `continue` executes steps before checking the condition; `break` exits immediately.

## break

`break;` exits the nearest enclosing loop without a result value. Execution continues after the loop. It is invalid without a loop target.

```carven
for value in 0..10 {
    if value == 3 {
        break;
    }
    println(value);
}
```

This prints 0, 1, and 2.

## continue

`continue;` skips the rest of the current loop body and starts the next iteration. A `while` checks its condition, iteration loops advance the cursor, and C-style `for` executes its steps first.

```carven
for value in 0..5 {
    if value % 2 == 0 {
        continue;
    }
    println(value);
}
```

This prints 1 and 3. Neither `break` nor `continue` supports named labels.

## return

`return expression;` returns a successful result from the current function or lambda. `return;` is valid only for a `void` success result. A function block does not implicitly return its final expression. A function returning one expression usually uses an expression body:

```carven
fn absolute(value: i32) -> i32 => if value < 0 { -value } else { value };

println(absolute(-3)); // 3
```

Returning a named owner copies by default; write `return &&owner;` when transfer is intended. See [functions](/reference/functions/) for result inference, complete return paths, and failure consumption, and [ownership](/reference/ownership/) for transfer.

## match and patterns

Both statement and value match must be exhaustive; value match also requires compatible results. The subject evaluates once. An rvalue subject survives guard rejection. For storage subjects, receiver and index are selected once and remain stable through matching.

```carven
enum Reply {
    Empty,
    Number(i32),
}

fn unpack(reply: Reply) -> i32 => match reply {
    .Empty => 0,
    .Number(value) if value > 0 => value,
    .Number(_) => -1,
};
```

Select the first arm in source order whose pattern matches and guard passes. Guards may modify other storage, call functions, and fail. They cannot obtain Write/Take access to overlapping subject storage through direct access, aliases, or captures. A selected arm body may modify the subject.

Patterns support recursive enum cases, integer ranges, literals, bindings, _, `is T`, and |. There is no struct/array destructuring. Payload counts must match exactly. A bare identifier creates an immutable owner; it never means equality with a same-named constant. Payloads copy once after case matching and before the guard.

`is T` requires an already compatible canonical subject type and covers that type under this constraint. Alternatives must bind the same names with the same types, without duplicate bindings within an alternative. Guards use established bindings but do not contribute ordinary match exhaustiveness coverage.

Repeated or subsumed alternatives within one or-pattern are errors. An arm fully covered by preceding unguarded arms gets `CV-FLOW-UNREACHABLE-MATCH-ARM`; its source is still checked but it does not participate in runtime selection. Missing cases are described with a deterministic shortest witness.

## Integer range patterns

Integer subjects and integer enum payloads accept `a..b`, `a..=b`, `..b`, `..=b`, and `a..`. The omitted side extends to the corresponding end of the subject type's domain. Present bounds use the subject's integer type. Empty and reversed intervals never match.

```carven
fn inside(value: i32, low: i32, high: i32) -> bool => match value {
    low..=high => true,
    _ => false,
};
```

Here low and high are runtime bounds, so `_` supplies the remaining coverage. Only directly known, execution-free bounds contribute to static coverage; dynamic bounds do not prove exhaustiveness. Even a known result retains its bound evaluation when that evaluation has effects.

Bounds execute left to right, once each, only when their pattern is attempted and before containment is tested. A rejected enum case, an earlier rejected payload, or a successful earlier or-pattern alternative skips later bounds. A bound failure propagates out of matching; it does not simply reject the arm. Bounds cannot obtain Write/Take access to the subject or refer to bindings introduced by the same pattern. Recursive range patterns also work in catch payloads.

For example, `..0`, `0..=100`, and `101..` cover all `i32` values without a wildcard. Removing the last interval makes that match incomplete; guards do not fill the gap.

## Transfer boundaries of value branches

return targets the current function or lambda; break/continue target loops. Result branches of value-form if/match/try cannot return to an outer function or break/continue an outer loop. A loop created inside a branch may receive its own transfers. A constant block has the same boundary. Violations produce `CV-FLOW-TRANSFER-BOUNDARY`.

## Order and inactive code

The callee precedes arguments; the left operand precedes the right; the receiver precedes the index; the assignment target precedes its right side. Initializers follow written source order. Every operand on a selected evaluation path runs once. Failure immediately skips the rest of that path.

Every source operand and branch receives operation, result-compatibility, and failure-consumption checks, including after a terminal statement. Only source after a terminal statement contributes no runtime evaluation, outward failure, ownership transition, or reachable-use evidence. A nonreturning expression may appear where its type is known; a call still needs a callable type and match still needs a subject type.

A condition’s value never changes analysis. Reachability, failures, ownership, pointer proofs, and returns consider every branch of ordinary `if`, `&&`, `||`, `match`, and conditional loops, whether a condition is a literal, a `const`, or a runtime value. `if false` and `while true` retain both analysis paths. Only a conditionless `while { ... }` is known not to end by itself; it exits through `break`. [Static control](/reference/functions/#static-control) explicitly selects specialization and generation while all source arms remain checked.

## Operator domains

See [operators and expressions](/reference/operators/) for spellings, operand domains, and equality rules.

## Integer range values

See [range expressions](/reference/operators/#range-expressions) for `begin..end` and `begin..=end` construction, type inference, and snapshot rules.

## if and loops

See the [if](#if), [while](#while), and [for](#for) entries on this page for syntax and examples.
