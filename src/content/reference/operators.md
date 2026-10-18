---
title: "Operators and expressions"
description: Arithmetic, comparisons, logic, access, assignment, updates, precedence, and evaluation order.
section: reference
lesson: 5
source: docs/language/control-flow.md
---

## Operator overview

An expression computes a value. Assignment and increment/decrement update storage and occur only in statements or `for` headers that admit them. The operand requirements below apply to Carven types; external C++ types use native operation rules.

| Category    | Spelling                     | Operands and result                                                                                 |
| ----------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| Arithmetic  | `+` `-` `*` `/`              | Identical numeric types, producing that type                                                        |
| Remainder   | `%`                          | Identical integer types                                                                             |
| Prefix      | `-` `!` `~`                  | Numeric negation, boolean negation, integer complement                                              |
| Dereference | `*`                          | Access the locally proven non-null [pointer target](/reference/pointers/#conversions-and-arguments) |
| Bitwise     | `&` `\|` `^` `<<` `>>`       | Integer operations                                                                                  |
| Ordering    | `<` `<=` `>` `>=`            | Identical numeric types, producing `bool`                                                           |
| Equality    | `==` `!=`                    | Compatible equality-capable types, producing `bool`                                                 |
| Logical     | `&&` `\|\|`                  | `bool` operands, short-circuiting left to right                                                     |
| Conversion  | `as`                         | Explicit conversion from the [conversion table](/reference/types/#as-conversions)                   |
| Range       | `..` `..=`                   | Integer bounds, producing `Range<T>`                                                                |
| Access      | `&` `&&`                     | Write or Take access; see [ownership](/reference/ownership/)                                        |
| Postfix     | `(...)` `[...]` `.` `->` `?` | Calls, indexing, members, pointer members, failure propagation                                      |

```carven run
let total = 2 + 3 * 4;
let allowed = total >= 10 && total < 20;
println(total, allowed); // 14 true
```

Integers do not automatically promote to other integer or floating types. Numbers do not become boolean conditions. Literals may receive an expected type; established variables do not change type to satisfy an operation.

`Type::name` selects an associated operation or enum case. A leading `::` or a native name qualifier selects [C++ names](/reference/interop/#headers-and-external-names); module import paths follow [module syntax](/reference/modules/#three-import-path-forms). `=>` marks an expression body or branch arm. These delimiters do not introduce extra binary precedence levels.

## Precedence and parentheses

This table runs from highest to lowest precedence. Repeated ordinary binary operators and `as` associate left. Comparisons share one non-associative level: write `a < b && b < c`, not `a < b < c`.

| Precedence | Operation                                        |
| ---------- | ------------------------------------------------ |
| Highest    | Postfix calls, indexing, members, `?`            |
|            | Prefix `-` `!` `~` `*`                           |
|            | `as`                                             |
|            | `*` `/` `%`                                      |
|            | `+` `-`                                          |
|            | `<<` `>>`                                        |
|            | `<` `<=` `>` `>=` `==` `!=`                      |
|            | Binary `&`                                       |
|            | `^`                                              |
|            | Binary `\|`                                      |
|            | Logical `&&`                                     |
|            | Logical `\|\|`                                   |
|            | `..` `..=`                                       |
| Lowest     | Access markers `&` `&&` at an expression's start |

`await` has a separate prefix production: operand calls, members, and indices stay inside it, while a trailing `?` propagates the awaited completion. Group the result to access its members, as `(await action()).member`; see [await parsing](/reference/async/#cold-operations-and-await).

An access marker covers the complete expression to its right. `&&value` is Take; `left && right` is logical conjunction. Parentheses make the intended scope explicit. There is no comma expression. The [grammar appendix](/reference/grammar/#precedence) gives the full productions.

## Assignment and updates

```text
target = expression;
target += expression;
++target;
--target;
```

The target must be writable. Compound assignments include `+=`, `-=`, `*=`, `/=`, `%=`, `&=`, `|=`, `^=`, `<<=`, and `>>=`; they read the old value before writing. Increment and decrement use prefix spelling only. Assignments and updates have no expression value and cannot be ordinary call arguments or initializers.

```carven run
var count = 1;
count += 2;
++count;
println(count); // 4
```

```carven
var count = 1;
let changed = ++count; // Compile error: an update is not an expression.
```

## Short-circuiting and evaluation order

Logical conjunction skips its right operand when the left is `false`. Logical disjunction skips its right operand when the left is `true`. This selects runtime evaluation; both source operands still receive type, access, and failure-contract checks.

```carven run
fn report() -> bool {
    println("called");
    return true;
}

let result = false && report();
println(result); // false; called is not printed.
```

The callee precedes arguments, the left operand precedes the right, the receiver precedes the index, and the assignment target precedes its right side. Construction initializers evaluate in written source order. Each operand on the selected path evaluates once; failure skips the remainder of that path. Static arguments evaluate separately during specialization under the [static parameter rules](/reference/functions/#static-parameters).

## Equality comparisons

Equality supports `void`, `bool`, `char`, integers, floating point, `str`, `String`, arrays and tuples with comparable elements, numeric enums, payload enums with comparable payloads, and pointers with the same target type. Structures, classes, callables, slices, integer ranges, and text character views do not support equality.

```carven run
println("same" == "same", [1, 2] == [1, 2]); // true true
```

Floating comparisons follow IEEE; `!=` negates `==`. SIMD comparisons produce masks under the [vector and mask rules](/reference/simd/#operators-and-masks). Unsupported type comparisons report `CV-TYPE-EQUALITY-UNSUPPORTED`.

## Integer arithmetic and termination

Wrapping, division overflow, shift counts, and runtime traps follow the [numeric rules](/reference/types/#arithmetic-and-termination). These traps are not typed failures and cannot be caught with `try` / `catch`.

## Range expressions

`begin..end` excludes the upper bound; `begin..=end` includes it. Both have type `Range<T>`. An ordinary expression requires both integer bounds; omitted bounds occur only in patterns. A range saves a snapshot of its bounds rather than borrowing their source storage.

```carven run
var end = 4;
let values: Range<i32> = 1..=end;
end = 8;
for value in values {
    println(value);
}
```

This prints 1 through 4. Bounds evaluate once, left to right. An expected `Range<T>` supplies T to both; otherwise the [binary expected-type rule](/reference/types/#expected-types) selects T, as in `0..text.byte_length()` producing `Range<usize>`. Incompatible bounds report `CV-TYPE-RANGE-BOUNDS`. Step and implicit reverse traversal are unsupported. See [control flow](/reference/control/) for loops and range patterns.

## Related entries

[Variable declarations](/reference/bindings/) · [Types and conversions](/reference/types/) · [Control flow](/reference/control/) · [Failure propagation](/reference/failures/)
