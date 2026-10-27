---
title: "Control flow and patterns"
description: Syntax, execution, and restrictions for if, while, for, match, break, continue, and return.
section: reference
lesson: 6
source: docs/language/control-flow.md
---

## Control-flow overview

Control statements select branches, repeat execution, or leave the current flow. `if`, `match`, and `try` can also be value-producing expressions. `while` and `for` are loop statements. Conditions require `bool`, and control bodies are braced.

| Form                                        | Purpose                                                           |
| ------------------------------------------- | ----------------------------------------------------------------- |
| `if condition { ... } else { ... }`         | Select a branch by condition                                      |
| `while condition { ... }`                   | Repeat while a condition is true                                  |
| `while { ... }`                             | Repeat until a transfer leaves the loop                           |
| `for value in source { ... }`               | Iterate an integer range, array, Vector, slice, or character view |
| `for initializer; condition; steps { ... }` | Loop with initialization and steps                                |
| `match value { ... }`                       | Select a branch by pattern                                        |
| `break;` / `continue;`                      | Leave the nearest loop / start its next iteration                 |
| `return value;`                             | Return from the current function or lambda                        |

[`try` / `catch` and failure propagation](/reference/failures/) have a separate chapter. [`const if` / `const for`](/reference/functions/#static-control) select static specialization.

## if

A statement-form `if` can omit `else`. Conditions are checked in order, and the first true branch executes. If none succeeds, the `else` branch executes when present. Numbers and pointers do not implicitly convert to `bool`.

```carven run
let score = 75;
if score >= 90 {
    println("excellent");
} else if score >= 60 {
    println("pass");
} else {
    println("retry");
}
```

This prints `pass`. A value-form `if` requires `else`. To produce a result other than `void`, each normally completing branch ends with a compatible result expression, without a semicolon after that expression. A branch block without a final expression produces `()`, the `void` value.

```carven run
let score = 75;
let status = if score >= 60 { "pass" } else { "retry" };
println(status); // pass
```

Value branches of `if`, `match`, and `try` receive the surrounding expected type and may produce [contextual constructions](/reference/aggregates/#contextual-construction). Statement forms produce no value. A value branch cannot transfer control to an outer function or loop; see [transfer boundaries](#transfer-boundaries-of-value-branches).

```carven
let result = if true { 1 }; // Compile error: value-form if requires else.
```

A statement-form `if` branch may use `=>` followed by one simple statement, including its semicolon. Each branch may independently choose an arrow or a block.

```carven run
fn nonnegative(value: i32) -> i32 {
    if value < 0 => return 0;
    return value;
}
println(nonnegative(-2)); // 0
```

Arrow bodies admit declarations, assignments, updates, expressions, cancellation, and control transfer. Use a block for multiple statements or a direct nested `if`, loop, `match`, `try`, or `const` block. `const if` admits the same statement branches. Value-form `if` keeps braced result branches.

## while

`while condition { ... }` checks the condition before each iteration. A false condition ends the loop, possibly without any iteration. `while { ... }` omits the condition and suits flows that explicitly exit inside the body.

```carven run
var count = 0;
while count < 3 {
    println(count);
    ++count;
}
```

This prints 0, 1, and 2. A conditionless loop:

```carven run
var count = 0;
while {
    if count == 3 => break;
    ++count;
}
println(count); // 3
```

Only `while { ... }` is analyzed as not ending by itself. `while true { ... }` retains a condition-exit analysis path.

## for

### Iteration form

`for name in source { ... }` iterates integer ranges, arrays, Vectors, read-only slices, or text character views. A binding may have a type annotation. Writable arrays and Vectors permit `for &name in source` to modify elements.

```carven run
var values = [1, 2, 3];
for &value in values {
    value *= 2;
}
for index in 0..values.length() {
    println(values[index]);
}
```

This prints 2, 4, and 6. The literal `0` receives `usize` from the length operand, so no suffix is needed. `0..3` excludes 3; `0..=3` includes it. Reversed ranges are empty. Equal bounds produce no elements for a half-open range and one for a closed range. Closed ranges may include the integer type's maximum without overflowing at the final step.

An integer-range loop snapshots its range on entry; later changes to the source range or its original bounds do not change the traversal. Integer range bindings cannot be Write. Slices and character views permit only Read. Range bindings cannot be Taken, and their names are not visible in their own type or range source.

Array and Vector iteration retain access to the source owner until exit, preventing whole-owner Take during iteration. Vector iteration also prohibits structural changes such as `push`, `remove`, and `clear`; Write iteration may update existing elements. Writing an element does not restore an unavailable whole array. Elements are accessed only after cursor validity is established, and the end check reads no out-of-bounds element.

### C-style form

```text
for initializer; condition; step1, step2 {
    statements
}
```

The header has no surrounding parentheses. Initialization and steps are optional; the condition is required and must be `bool`. The loop establishes its own scope, initializes once, checks the condition, executes the body, then executes steps in written order.

```carven run
var total = 0;
for var index = 0; index < 4; ++index {
    total += index;
}
println(total); // 6
```

Steps admit assignment, prefix increment/decrement, and ordinary expressions; commas separate multiple steps. `continue` executes steps before checking the condition; `break` exits immediately.

## break

`break;` exits the nearest enclosing loop without a result value. Execution continues after the loop. It is invalid without a loop target.

```carven run
for value in 0..10 {
    if value == 3 => break;
    println(value);
}
```

This prints 0, 1, and 2.

## continue

`continue;` skips the rest of the current loop body and starts the next iteration. A `while` checks its condition, iteration loops advance the cursor, and C-style `for` executes its steps first.

```carven run
for value in 0..5 {
    if value % 2 == 0 => continue;
    println(value);
}
```

This prints 1 and 3. Neither `break` nor `continue` supports named labels.

## return

`return expression;` returns a successful result from the current function or lambda. `return;` is valid only for a `void` success result. A function block does not implicitly return its final expression. A function returning one expression usually uses an expression body:

```carven run
fn describe(value: i32) -> str => if value == 0 { "zero" } else { "nonzero" };

println(describe(3)); // nonzero
```

Returning a named owner copies by default; write `return owner;` when transfer is intended. See [functions](/reference/functions/) for result inference, complete return paths, and failure consumption, and [ownership](/reference/ownership/) for transfer.

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

Patterns support recursive tuples and enum cases, integer ranges, literals, bindings, `_`, `is T`, and `|`. There is no struct or array destructuring. Payload counts must match exactly. A bare identifier binds Read access to the selected value; it never tests equality with a same-named constant. Pure Carven values are saved as snapshots, while storage-containing values, including native holders, are borrowed. `&name` binds Write access and requires a writable tracked subject. Bindings become available after the whole pattern matches and before the guard runs; they cannot be taken. Borrowed bindings keep their enclosing storage stable, so that storage cannot be replaced or Taken while borrowed.

`is T` requires an already compatible canonical subject type and covers that type under this constraint. Alternatives must bind the same names with the same types and access modes, without duplicate bindings within an alternative. Guards use established bindings but do not contribute ordinary match exhaustiveness coverage.

Repeated or subsumed alternatives within one or-pattern are errors. An arm fully covered by preceding unguarded arms gets `CV-FLOW-UNREACHABLE-MATCH-ARM`; its source is still checked but it does not participate in runtime selection. Missing cases are described with a deterministic shortest witness.

`match &&owner` transfers the complete subject into retained match storage. Pattern bindings still use Read or Write access; rejecting a guard does not transfer individual payloads. To create an independent owner in an arm, copy the selected payload with `let owned = payload;`, then transfer that owner with `&&owned`.

Literal patterns use normalized language equality. In particular, `0.0` and `-0.0` are the same floating pattern, so using both as alternatives is a duplicate.

## Tuple patterns and Write bindings

Tuple patterns recurse with exact arity and nesting. `()` matches unit, `(pattern)` groups, and `(pattern,)` matches a singleton. Tuple positions and enum payloads admit case, literal, binding, wildcard, range, `is`, and or-patterns. Element tests and dynamic bounds run left to right; earlier rejection skips later effects. `(true, _) | (_, true)` still leaves `(false, false)` uncovered.

```carven run
var records = [("alpha", 2), ("beta", 3)];
for &(name, count) in records {
    count *= 2;
    println(name, count);
}

var pair = (true, 3);
match pair {
    (true, &count) => { count *= 2; },
    (false, _) => {},
}
println(pair.1); // 6
```

The loop target projects the current tuple element with Write access. It does not make tuples themselves iterable. In the match, `&count` modifies the selected field of `pair`; the first Boolean field selects which arm runs. Guards and borrowed bindings follow the rules in [match and patterns](#match-and-patterns).

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

Expressions follow the [evaluation-order rules](/reference/operators/#short-circuiting-and-evaluation-order). A failure skips the remaining evaluation on its current path.

Every source operand and branch receives operation, result-compatibility, and failure-consumption checks, including after a terminal statement. Only source after a terminal statement contributes no runtime evaluation, outward failure, ownership transition, or reachable-use evidence. A nonreturning expression may appear where its type is known; a call still needs a callable type and match still needs a subject type.

Ordinary conditions do not skip source checking. Structural reachability, failure contracts, and return analysis consider every branch of `if`, `&&`, `||`, `match`, and conditional loops, even for literals or constants. Ownership availability and pointer proofs first account for condition effects, then use proven Boolean results to select possible normally continuing paths; unknown conditions merge both. Only a conditionless `while { ... }` is known not to end by itself; it exits through `break`. [Static control](/reference/functions/#static-control) explicitly selects specialization and generation while all source arms remain checked.
