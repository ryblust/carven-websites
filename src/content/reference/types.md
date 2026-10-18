---
title: "Types and conversions"
description: "Builtin types, nominal identity, contextual inference, and numeric conversion boundaries."
section: reference
lesson: 3
source: docs/language/types.md
---

A type tells the compiler which values and operations are allowed. Write `let count: i32 = 3;` when you want an explicit type, or `let count = 3;` to infer it from the initializer. Function parameters, results, fields, and collection elements use the same type syntax.

## Type identity

Named types follow [module lookup, aliases, and defaults](/reference/modules/#standard-modules-and-defaults). Structural `ptr` syntax has the [additional naming restrictions](/reference/keywords/#other-special-spellings).

Each struct, class, or enum declaration defines a distinct type. Two declarations with the same fields still define different types. This is called nominal type identity. Arrays are identified by both element type and
extent. Nonempty tuples are identified by their ordered element types, arity,
and nesting: `(i32, bool)` differs from `(bool, i32)` and `((i32,), bool)`.
`(T,)` is a one-element tuple; `(T)` groups a type. Slices are identified by their
element type. Function-view types include parameter access, parameter types,
success result, and failure set.

Ordinary Carven values are compatible when they have the same type, after resolving aliases.
Numbers, slices, text, callable views, and pointers have operation-specific
contextual conversions.
Carven does not generally promote numbers, convert matching field layouts, or treat non-Boolean values as conditions. It has no opaque dynamically typed value.

`void` is the zero-information unit type, with the single value `()`. The empty
tuple type `()` denotes the same canonical type as `void`. A completed call with
a `void` success result produces that value. It can be bound, passed as an
argument, stored in a field, array or tuple, returned, and matched with a wildcard
or binding pattern. Its default value is `()`, and two unit values compare equal.

```carven run
fn finish() {}
fn accept(_: void) {}
let completed: void = finish();
let product: (i32, void) = (7, completed);
let units: [void; 2] = [(); 2];
accept(product.1);
println(units.length()); // 2
```

See [C++ function boundaries](/reference/interop/#declared-function-boundaries) for the native representation of unit parameters and results.

C++ checks construction and conversion operations involving external types.

## Scalar types

These names are default bindings from `std::core`. Integer widths include the sign bit for signed types. Signed integers use two's-complement arithmetic.

| Type                      | Width and values                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `i8`, `i16`, `i32`, `i64` | 8, 16, 32, 64 bits; a signed `N`-bit integer ranges from `-2^(N-1)` through `2^(N-1)-1`      |
| `u8`, `u16`, `u32`, `u64` | 8, 16, 32, 64 bits; an unsigned `N`-bit integer ranges from zero through `2^N-1`             |
| `isize`, `usize`          | Signed and unsigned pointer-width integers; analysis and target must use the same data model |
| `f32`, `f64`              | IEEE 754 binary32 and binary64, including signed zeros, infinities, and NaNs                 |
| `bool`                    | `false` and `true`; no implicit numeric or pointer truth conversion                          |
| `char`                    | One Unicode scalar: U+0000..U+D7FF or U+E000..U+10FFFF                                       |
| `void`, `()`              | The unit type, with the single value `()`                                                    |

[`str` and `String`](/reference/text/) represent borrowed and owning UTF-8 text. [SIMD types](/reference/simd/#types-and-modules) define fixed logical lane shapes. [Arrays, tuples, structs, classes, enums, and `Vector<T>`](/reference/aggregates/), [slices `[T]`](/reference/slices/), [pointers `ptr<T>` and `ptr<&T>`](/reference/pointers/), [callable views `fn(...) -> R`](/reference/closures/#non-owning-callable-views), [integer ranges `Range<T>`](/reference/operators/#range-expressions), and [operations `Operation<T, throw E>`](/reference/async/#cold-operations-and-await) have their own construction and access rules.

## Nominal type parameters

Structs and payload enums can declare type and failure-set parameters:

```carven run
struct Box<T> { value: T }
enum Maybe<T> { None, Some(T) }

let boxed = Box<i32> { value: 7 };
let present = Maybe<i32>::Some(7);
let absent: Maybe<String> = .None;
println(boxed.value, present == .Some(7), absent == .None); // 7 true true
```

A parameter is scoped to its declaration. Field and payload types can use type
parameters, nested nominal applications, arrays, tuples, slices, pointers, and
Operations. `throw E` declares a failure-set parameter, which may appear in
failure contracts but cannot be used as an object type:

```carven
import std::async using Operation;

struct Pending<T, throw E> { operation: Operation<T, throw E> }
```

An application supplies every argument explicitly and in its declared kind,
for example `Pending<i32, throw Error>` or `Pending<i32, throw ()>`.
Failure sets contain copyable nominal payload types; `throw ()` supplies the empty set.
The declaration and its ordered canonical type and failure-set arguments
determine nominal identity;
repeated applications share that identity.
Array extents and nominal failure payload types must be independent of type
parameters. Callable signatures and native template arguments that depend on a
parameter are not supported.

Definitions are checked even when unused. Recursive applications may forward
or permute parameters; a recursive cycle that constructs larger arguments is
rejected. By-value layout cycles are rejected independently of argument growth.
Pointers and slices break by-value storage cycles.

Concrete instances use the existing construction, copying, Take, borrowing,
matching, default-initialization, and equality rules for their actual types.
An enum still has no implicit default case. Visibility checks consider both the
generic declaration, every type argument, and every member of a failure-set
argument.

Parameterized class operations and numeric enums are not supported.
A parameterized class without operations uses the same field-type model and
keeps its representation private.

Functions support the same parameter kinds and infer omitted arguments from their
signature, actual argument types, and immediate expected result.

## Expected types

An expected type is supplied by a surrounding source operation. It guides
literal typing and the defined value conversions. An explicit annotation fixes
the required type; an incompatible initializer is rejected.
The following are supported sources of context:

| Position                                    | Source of expected type                                 |
| ------------------------------------------- | ------------------------------------------------------- |
| Annotated binding or constant initializer   | Declared type                                           |
| Assignment value                            | Destination type                                        |
| Call argument                               | Selected parameter type                                 |
| Return value                                | Declared or context-supplied callable result            |
| Structure field or enum payload initializer | Declared field or payload type                          |
| Array element with an expected array type   | Expected element type                                   |
| Tuple element with an expected tuple type   | Corresponding element type                              |
| Value-control result branch                 | Expected result type, when supplied                     |
| Lambda parameter and result                 | Expected callable view, subject to explicit annotations |

Grouping passes an existing expected type to its operand. Numeric and string
literals and contextual enum cases use that expected type.
Context does not change a binding's declared type. An admitted value conversion
can produce the expected type. Context does not supply an omitted call access
marker or insert a capture.

For ordinary binary operands, a direct unsuffixed numeric literal on the left
obtains context from a right operand that is not a direct unsuffixed numeric
literal. Otherwise the left operand receives the surrounding context and
supplies context to the right operand. For equality, a direct contextual
`.Case` or `.Case(...)` obtains its enum context from the other operand when
that operand is not itself a direct contextual case. This selection precedes
the numeric-literal rule. Logical operators instead require `bool` operands.

Integer range bounds use the same numeric sibling-selection rule when there is
no expected `Range<T>` type. An expected `Range<T>` supplies `T` to the bounds.
Thus `0..text.byte_length()` has type `Range<usize>`: the literal is checked directly as
`usize`, without converting an `i32` value. Two unsuffixed bounds without an
expected type still default to `i32`. Suffixed literals and existing bindings
keep their types; incompatible bounds and literals outside the selected type's
range are rejected. This applies to stored ranges, calls, returns, and loops.

These sibling-selection rules inspect the direct operand form: they do not
search inside grouping, unary operations, or composite expressions to discover
a literal or case. Thus grouping can receive context without itself acting as
a direct contextual operand for sibling selection. Type-context selection
never changes runtime left-to-right evaluation order.

Without an annotation, a runtime binding takes its initializer's inferred
type; later uses do not revise it. There is no general search for a
type that would make all uses succeed. A contextual form without a determining
context is invalid; spell the type or enum owner explicitly.

```carven run
let length = 3usize;
println(0 + length); // 3
// Check separately: (0) + length has incompatible numeric types.
enum Status { Ready, Busy }
let ready: Status = .Ready;
println(.Ready == ready); // true
```

## Contextual adaptations

An expected type can select the following value adaptations:

| Source                     | Expected type and result                                    |
| -------------------------- | ----------------------------------------------------------- |
| Unsuffixed numeric literal | A representable type in the same integer or floating family |
| String literal             | An owning `String` when required                            |
| `String`                   | A borrowed `str` view                                       |
| Array or `Vector<T>`       | A borrowed `[T]` view                                       |
| Concrete callable          | A compatible non-owning callable view                       |
| `ptr<&T>`                  | `ptr<T>`, narrowing target access                           |

The source's type stays unchanged. Write arguments require matching existing storage. A completed constant retains an owning String unless an explicit `str` destination requests a view. Text, slice, callable, and pointer adaptations retain their owning references' lifetime and access requirements.

## Numeric literals

The integer types are the fixed-width signed and unsigned types plus `isize`
and `usize`; the floating types are `f32` and `f64`. `char` is not numeric.
Unsuffixed integer literals default to `i32` and unsuffixed floating literals
default to `f64`. In an expected numeric context, an unsuffixed literal may
instead adopt a representable type from the same integer or floating family.
Floating literal text is converted directly to the selected precision using the
host's native parsing, without an intermediate floating type. A literal outside
the selected type's conversion range is rejected. Negation is checked with the literal's sign, including through grouping: `-(2147483648)` is the `i32` minimum, while `2147483648` alone is out of range.

For `ns`, `us`, `ms`, and `s` suffixes and checked duration construction, see [time](/reference/time/).

Numeric types are otherwise compatible only with the identical
canonical type. There is no implicit integer promotion, signedness conversion,
or integer-to-floating conversion.

## `as` conversions

`expression as Type` supports identity conversion and the numeric and text conversions below. Pointer erasure and restoration follow the separate [pointer conversion rules](/reference/pointers/#erasure-comparison-and-display). Conversions involving external C++ types are checked by C++.

- identity conversion between the same canonical type;
- every integer-to-integer conversion;
- conversions in either direction between an integer and `bool`;
- an integer to `f32` or `f64`;
- `f32` to `f64`;
- a numeric enum value to any integer type;
- `char` to `u32`;
- `str` to `String`, producing an independent owning copy.

It rejects narrowing `f64` to `f32`, floating-point to integer or `bool`,
`bool` to floating-point, integer to enum, other conversions between `char` and a
numeric type, and `String` to `str` through `as`.

An integer-to-integer cast keeps the residue modulo `2^N`, where `N` is the target width. An unsigned target uses that residue; a signed target interprets the same bits as a two's-complement value.

Integer-to-`bool` yields `false` for zero and `true` for every nonzero value,
including negative values. `bool`-to-integer yields zero for `false` and one for
`true` in the requested integer type. These conversions require `as`; they do
not make integer conditions valid.

## Arithmetic and termination

Integer negate, add, subtract, multiply, and left shift wrap at the
Carven type width; compound assignment and increment/decrement inherit the same
rule. Signed `MIN / -1` returns `MIN`, with remainder zero. Division or remainder
by zero and a negative or out-of-width shift count terminate at runtime with a
trap report and diagnose during static execution. Signed right shift is arithmetic.

```carven run
const wrapped: i32 = 2147483647 + 1;
let runtime: u8 = 255u8 + 1;
println(wrapped, runtime); // -2147483648 0
```

`isize` and `usize` are the signed and unsigned native-model integers. Their
width is fixed by the supported compilation data model and participates in the
ordinary integer rules above. Analysis uses the host pointer-sized integer
widths; the target must use the same data model.

`f32` and `f64` use IEEE 754 binary32 and binary64 storage. See [floating methods](#floating-methods) for queries and scalar operations. Runtime floating
arithmetic and integer-to-floating conversion use the corresponding native C++
operations. The language does not supply a rounding-mode control or a separate
floating exception mechanism. Native floating results depend on the selected
C++ compiler and floating environment. Floating division follows those native
operations, including their handling of zero divisors.

Static execution and interpretation perform each floating operation
using the compiler host's native `float` or `double` environment. They support
negation, addition, subtraction, multiplication, division, comparisons, and the
ordinary admitted numeric casts. Signed zero, infinities, and NaNs are values;
floating division by zero does not use the integer divide-by-zero diagnostic.
Frozen results preserve their representation when reconstructed in generated C++.
Results can differ from runtime execution under different target settings,
rounding modes, or optimization choices. Target-specific evaluation is not
implemented.

## Read-only slices

`[T]` is a read-only view; `[T; N]` is an owning fixed array. See [slices](/reference/slices/) for construction, operations, borrowing, and constant storage. [`str::from_utf8(bytes)`](/reference/text/) borrows `[u8]` storage under the same lifetime and mutation rules.

## Floating methods

`f32` and `f64` provide builtin value methods without imports. All methods use
Read access and support constant initializers, `const fn`, interpretation, and
native execution. Numeric arguments must have the receiver's precision;
unsuffixed literals receive that expected type. Numeric results retain the
receiver's precision.

| Method                                  | Contract                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `value.is_finite() -> bool`             | False for NaN and either infinity                                                                              |
| `value.abs()`                           | Absolute value; both +0 and -0 become +0; NaN remains NaN                                                      |
| `value.min(other)` / `value.max(other)` | Propagate either NaN; equal numbers retain the receiver, including its zero sign                               |
| `value.clamp(lower, upper)`             | Assert `lower <= upper`, including ordered bounds; preserve a NaN value and return the selected bound or value |
| `value.sqrt()`                          | Preserve signed zero and +infinity; negative nonzero inputs, -infinity, and NaN produce NaN                    |

Equal clamp bounds are valid. Reversed or NaN bounds are assertion failures,
including when the result is discarded; they are not typed failures. The receiver
and explicit arguments evaluate once in source order before the operation.
Methods require direct calls and do not produce first-class method values.

Floating results follow the selected execution host's floating environment.
Cross-target bit identity, NaN payloads, and non-default rounding modes are not
guaranteed.

## Numeric text parsing

Every scalar integer type, including `isize` and `usize`, and `f32` and `f64`
provide a builtin associated function `T::parse(text: str) -> T throw NumberParseError`.
Calling the function and propagating its failure do not require importing the
error type.
`NumberParseError` is a standard-source nominal enum with one nullary case,
`Invalid`. Import it from `std::core` when naming it in source.
Aliases of numeric types provide the same factory. Parsing supports constant
initializers, `const fn`, interpretation, and native execution.

Parsing consumes the entire input and checks the requested type's range.
Malformed, incomplete, empty, or unrepresentable input throws
`NumberParseError::Invalid`. Use `?` to propagate the failure or `try/catch` to
handle it, including during static execution. Unhandled failures leaving a static
root follow the ordinary static execution diagnostic rules.

Integer parsing uses base ten. Signed types accept an initial `-`; unsigned types
reject it, including `-0`. Leading whitespace, a leading `+`, and trailing content
are rejected. Floating parsing uses general decimal format with exponents and
accepts infinity and NaN spellings. It preserves signed zero and parses directly
in the requested precision. Call `is_finite()` when finite values are required.
Parsing is locale-independent; application policies such as JSON number grammar
and nonzero port numbers belong to their callers.

```carven
const port = u16::parse("8080")?;
```

An explicit failure contract names the imported type:

```carven
import std::core using NumberParseError;

const fn parse_port(text: str) -> u16 throw NumberParseError => u16::parse(text)?;
```

The text input evaluates once with Read access. The result and error values do
not borrow the input storage. Factories require direct calls.
