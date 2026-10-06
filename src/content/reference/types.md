---
title: "Types, context, and conversions"
description: "Builtin types, nominal identity, contextual inference, and numeric conversion boundaries."
section: reference
lesson: 3
source: docs/language/types.md
---

## Builtin types

Write a type after `: Type` in a declaration or `-> Type` in a function result. Omitting a variable's annotation lets its initializer determine the type.

| Type                         | Meaning                                 | Example                                    |
| ---------------------------- | --------------------------------------- | ------------------------------------------ |
| `bool`                       | Boolean                                 | `true`, `false`                            |
| `char`                       | Unicode scalar                          | `'我'`                                     |
| `i8` / `i16` / `i32` / `i64` | Signed integer                          | `42`, `42i64`                              |
| `u8` / `u16` / `u32` / `u64` | Unsigned integer                        | `255u8`                                    |
| `isize` / `usize`            | Integer matching the pointer data model | `text.len()` returns `usize`               |
| `f32` / `f64`                | IEEE floating point                     | `1.5f32`, `1.5`                            |
| `str`                        | Nonowning UTF-8 text view               | `"hello"`                                  |
| `String`                     | Owning UTF-8 text value                 | `let name: String = "hello";`              |
| `void`                       | No successful result value              | `fn notify() -> void => println("ready");` |

```carven
let count: i32 = 3;
let name: String = "Carven";
println(count, name); // 3 Carven
```

Arrays `[T; N]`, slices `[T]`, integer ranges `range<T>`, pointers `ptr<T>` / `ptr<&T>`, and callable views `fn(...) -> T` have their corresponding forms. `struct`, `class`, and `enum` declare nominal types. SIMD provides fixed vector and mask types. See [builtin APIs](/reference/builtins/) for type members.

## Type identity

Builtin types are `bool`, `char`, `str`, `String`, `void`, signed integers `i8/i16/i32/i64/isize`, unsigned integers `u8/u16/u32/u64/usize`, and `f32/f64`. Fixed logical [SIMD types](/reference/simd/) are `u8x16`, `mask16`, `f32x4`, `mask4`, `u8x32`, `mask32`, `f32x8`, and `mask8`. Builtin type names are reserved; module declarations cannot reuse them.

Structs, classes, and enums have declaration identity; identical fields do not imply compatibility. A class is an ordinary value type with private fields; see [ordinary value classes](/reference/aggregates/#ordinary-value-classes). Array types include element type and length; slice types include element type. `range<T>` accepts a builtin integer element type. Half-open and closed intervals share that type; upper-bound inclusion is part of the value, not its type. Callable view types include parameter access, parameter types, success result, and failure set. Each pointer layer includes its target type and Read/Write target access.

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

Contextual construction uses these same sources: `{ field: value }` or `{}` is checked as construction of the expected type. The complete rules are in [contextual construction](/reference/aggregates/#contextual-construction).

Parentheses carry existing context. Context does not change a binding's type or insert access markers or captures. Inferred runtime bindings do not change type according to later uses. Inference does not search all use sites for one type that happens to work.

For a binary expression, a directly unsuffixed numeric left operand can take context from a right operand that is not such a literal. Otherwise, the left takes outer context and supplies the right's type. In equality comparisons, a direct `.Case` can take its enum type from the other operand when that operand is not a direct case. This takes precedence over the numeric rule. Logical operators require `bool`.

These rules inspect direct operands only; they do not search through parentheses, unary operations, or compound expressions for literals. Context selection does not change left-to-right runtime evaluation.

### Context has a local boundary

```carven
let length = 3usize;
println(0 + length); // 3: the direct left literal receives usize.

// Check separately: parentheses prevent sibling literal selection here.
// println((0) + length); // Compile error: i32 and usize do not match.
```

Parentheses still carry a type supplied from outside; they only prevent this particular direct-operand rule. Context does not flow backward from later statements:

```carven
enum Status { Ready, Busy }

let ready: Status = .Ready;
println(.Ready == ready); // true: the other direct operand supplies Status.
```

Removing `: Status` from the binding is an error at `.Ready`; the later comparison cannot supply its missing type.

### Contextual adaptations

The following adaptations are admitted when a destination type is already known. They do not change the source binding's type, and they are not general conversions between unrelated types.

| Source → destination                             | Effect                                                        |
| ------------------------------------------------ | ------------------------------------------------------------- |
| Unsuffixed numeric literal → same numeric family | Check the literal directly at the required precision or width |
| String literal → `String`                        | Construct independent owning text                             |
| `String` → `str`                                 | Borrow the current text backing; protect it from mutation     |
| `[T; N]` → `[T]`                                 | Borrow the array without copying elements                     |
| Concrete callable → compatible `fn(...)` view    | Adapt the target, borrowing capture storage when needed       |
| `ptr<&T>` → `ptr<T>`                             | Copy the address with narrower target permission              |

Write parameters retain an existing slot and do not use these value adaptations to change its type. Static freezing of an entire constant `String` result into `str` is a separate [constant-publication rule](/reference/constants/#admission-and-freezing).

## Numeric literals

Unsuffixed integers default to `i32` and floating literals to `f64`. Expected numeric context may select a representable type in the same integer or floating family. An explicit suffix fixes the type. `char` is not numeric.

```carven
let small: u8 = 12;
let real: f32 = 1.5;
let wide = 12i64;
// Compile error: an existing i64 value cannot implicitly become i32.
let narrow: i32 = wide;
```

Integer range bounds use the same numeric sibling selection when there is no expected `range<T>`: `0..text.len()` is `range<usize>`, checking the literal directly as `usize` rather than converting an `i32` value. An expected `range<T>` supplies T to both bounds. Two unsuffixed bounds default to `i32`; suffixed literals and existing bindings retain their types. Incompatible bounds or out-of-range literals are rejected. This applies to stored ranges, arguments, returns, and loops.

Floating literals convert directly to the selected precision using the host's native parsing, without an intermediate floating type. Literals outside that type's conversion range are rejected.

## `as` conversions

When both sides are Carven types, these conversions are allowed:

| Source       | Destination         | Result                                                |
| ------------ | ------------------- | ----------------------------------------------------- |
| Any type     | Same canonical type | Identity                                              |
| Integer      | Any integer         | Modulo `2^N`, interpreted with destination signedness |
| Integer      | `bool`              | Zero is false, otherwise true                         |
| `bool`       | Integer             | false is 0, true is 1                                 |
| Integer      | `f32` or `f64`      | Corresponding native floating conversion              |
| `f32`        | `f64`               | Floating widening                                     |
| Numeric enum | Any integer         | Case's numeric value                                  |
| `char`       | `u32`               | Unicode scalar number                                 |
| `str`        | `String`            | Independent owning text copy                          |

Disallowed conversions include `f64` to `f32`; floating point to integer or `bool`; `bool` to floating point; integer to enum; other numeric `char` conversions; and `String as str`. Borrow `String` as `str` through destination context or `.as_str()`.

## Arithmetic and termination

Integer negation, addition, subtraction, multiplication, and left shifts wrap at the type's width, as do compound assignments and increment/decrement. The rule is the same during required compile-time execution and at runtime, and for constant and `let` initializers alike. Signed minimum divided by -1 yields signed minimum, with remainder zero. Signed right shift is arithmetic.

Zero divisors for division/remainder, negative shift amounts, and shift amounts at least the width terminate at runtime. When required compile-time execution evaluates them, they are diagnostics instead (`CV-CONST-DIVIDE-BY-ZERO`, `CV-CONST-SHIFT-RANGE`). Evaluation never relies on undefined host arithmetic.

```carven
const wrapped: i32 = 2147483647 + 1;
let runtime: u8 = 255u8 + 1;
println(wrapped, runtime); // -2147483648 0
```

Literals are still range checked for their selected type: `let small: u8 = 256;` reports `CV-CONST-LITERAL-RANGE`. Negated literals are checked with their sign, including parentheses: `-(2147483648)` can represent `i32` minimum.

`isize`/`usize` width follows the host pointer model; the target must match. `f32`/`f64` are IEEE 754 binary32/binary64. Native C++ operations and the floating-point environment determine runtime floating behavior. The language has no independent rounding-mode control or floating exception mechanism; floating division by zero follows native floating rules.
