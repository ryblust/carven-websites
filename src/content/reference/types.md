---
title: "Types, context, and conversions"
description: "Builtin types, nominal identity, contextual inference, and numeric conversion boundaries."
section: reference
lesson: 3
source: docs/semantics.md
---

## Type identity

Builtin types are `bool`, `char`, `str`, `String`, `void`, signed integers `i8/i16/i32/i64/isize`, unsigned integers `u8/u16/u32/u64/usize`, and `f32/f64`.

Structs and enums have declaration identity; identical fields do not imply compatibility. Array types include element type and length; slice types include element type. `range<T>` accepts a builtin integer element type. Half-open and closed intervals share that type; upper-bound inclusion is part of the value, not its type. Callable view types include parameter access, parameter types, success result, and failure set. Each pointer layer includes its target type and Read/Write target access.

Ordinary Carven values require the same canonical type. Literal, text, slice, callable, and pointer conversions occur only in explicitly supported positions. There is no general numeric promotion, structural conversion, or truthiness.

void denotes absence of a value and is allowed only where no value is valid, such as a success result. It cannot be a parameter, field, array element, runtime binding, or match subject. `action();` may call a void function; `let x = action();` is invalid.

## Expected types

| Position                      | Source of context                                       |
| ----------------------------- | ------------------------------------------------------- |
| Annotated binding or constant | Declared type                                           |
| Assignment right side         | Destination type                                        |
| Argument                      | Selected parameter type                                 |
| return                        | Explicit or contextual result type                      |
| Field or enum payload         | Corresponding declared type                             |
| Element with array context    | Array element type                                      |
| Value-control branch          | Result type supplied by the enclosing context           |
| Lambda parameter or result    | Expected callable view, subject to explicit annotations |

Parentheses carry existing context. Context does not change a binding's type or insert access markers or captures. Inferred runtime bindings do not change type according to later uses. Inference does not search all use sites for one type that happens to work.

For a binary expression, a directly unsuffixed numeric left operand can take context from a right operand that is not such a literal. Otherwise, the left takes outer context and supplies the right's type. In equality comparisons, a direct `.Case` can take its enum type from the other operand when that operand is not a direct case. This takes precedence over the numeric rule. Logical operators require bool.

These rules inspect direct operands only; they do not search through parentheses, unary operations, or compound expressions for literals. Context selection does not change left-to-right runtime evaluation.

## Numeric literals

Unsuffixed integers default to i32 and floating literals to f64. Expected numeric context may select a representable type in the same integer or floating family. An explicit suffix fixes the type. char is not numeric.

```carven
let small: u8 = 12;
let real: f32 = 1.5;
let wide = 12i64;
// Compile error: an existing i64 value cannot implicitly become i32.
let narrow: i32 = wide;
```

## `as` conversions

When both sides are Carven types, these conversions are allowed:

| Source       | Destination         | Result                                                |
| ------------ | ------------------- | ----------------------------------------------------- |
| Any type     | Same canonical type | Identity                                              |
| Integer      | Any integer         | Modulo `2^N`, interpreted with destination signedness |
| Integer      | bool                | Zero is false, otherwise true                         |
| bool         | Integer             | false is 0, true is 1                                 |
| Integer      | f32 or f64          | Corresponding native floating conversion              |
| f32          | f64                 | Floating widening                                     |
| Numeric enum | Any integer         | Case's numeric value                                  |
| char         | u32                 | Unicode scalar number                                 |
| str          | String              | Independent owning text copy                          |

Disallowed conversions include f64 to f32; floating point to integer or bool; bool to floating point; integer to enum; other numeric char conversions; and `String as str`. Borrow String as str through destination context or `.as_str()`.

## Arithmetic and termination

Runtime integer negation, addition, subtraction, multiplication, and left shifts wrap at the type's width, as do compound assignments and increment/decrement. Signed minimum divided by -1 yields signed minimum, with remainder zero. Signed right shift is arithmetic. Zero divisors for division/remainder, negative shift amounts, and shift amounts at least the width terminate.

Required constant integer evaluation checks overflow instead of wrapping. Provably overflowing literal operations are diagnosed even in runtime let initializers. Negated literals are checked with their sign, including parentheses: `-(2147483648)` can represent i32 minimum.

isize/usize width follows the host pointer model; the target must match. f32/f64 are IEEE 754 binary32/binary64. Native C++ operations and the floating-point environment determine runtime floating behavior. The language has no independent rounding-mode control or floating exception mechanism; floating division by zero follows native floating rules.
