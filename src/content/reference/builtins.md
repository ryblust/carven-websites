---
title: Builtin functions and type APIs
description: Output, assertions, tests, addresses, text, sequence, and vector APIs that need no import.
section: reference
lesson: 20
source: docs/language/execution.md
---

## Builtin API overview

Use this page to look up functions and type methods that are available without importing a library, such as `println`, `assert`, and `String::from_str`. Their declarations belong to ordinary standard modules. Core, output, testing, and SIMD default bindings are available without `import`; other operations require explicit imports. Global functions such as `print` use ordinary name lookup and can be shadowed by local declarations. Standard Crafts functions require imports; see the [standard library reference](/reference/library/).

| Category                     | Entry                                                         |
| ---------------------------- | ------------------------------------------------------------- |
| Standard and error output    | [`print`, `println`, `eprint`, `eprintln`](#output-functions) |
| Runtime assertions           | [`assert`](#assert)                                           |
| Test assertions and stopping | [`check`, `require`, `fail`](#test-functions)                 |
| Address creation             | [`addressof`](#addressof)                                     |
| Text queries and mutation    | [`str` and `String`](#text-api)                               |
| Sequence queries and views   | [Arrays and slices](#array-and-slice-api)                     |
| Vector and mask operations   | [SIMD primitives](#simd-primitives)                           |

In the signatures below, `...`, `T`, and `N` describe parameter patterns. They are not user-generic or variadic declarations that can be copied into source. Each entry gives its call form, result, behavior, and restrictions.

## Output functions

| Call form                             | Result | Stream | Ending            |
| ------------------------------------- | ------ | ------ | ----------------- |
| `print(value, ...)`                   | `void` | stdout | No added newline  |
| `println(value, ...)` / `println()`   | `void` | stdout | One added newline |
| `eprint(value, ...)`                  | `void` | stderr | No added newline  |
| `eprintln(value, ...)` / `eprintln()` | `void` | stderr | One added newline |

Arguments use Read access, evaluate once from left to right, and are separated by one space. `print` and `eprint` require at least one argument; the newline functions admit no arguments. Text is printed verbatim rather than interpreted as a format string. Pass an explicit interpolated expression when formatting is needed.

```carven
println("answer", 42); // answer 42
println(f"hex: {42:04x}"); // hex: 002a
eprintln("status", "ready"); // Written to stderr.
```

`void` and character-iteration views cannot be printed. Structures, enums, arrays, and slices use structural display; classes display their type name. Printing has no typed failure and needs no `?`; native formatting or output errors terminate. `const fn`, constant blocks, and `const test` can print to the compiler host in their admitted subset. See [formatting and output](/reference/formatting/#printing) for structural display, evaluation, and buffering.

## assert

| Call form                    | Result | Parameters                                  |
| ---------------------------- | ------ | ------------------------------------------- |
| `assert(condition)`          | `void` | `bool` condition                            |
| `assert(condition, message)` | `void` | `bool` condition; `str` or `String` message |

A direct call evaluates its condition once. A true condition continues execution. A false condition evaluates the optional message, reports the location, condition, and applicable operand explanation, then terminates execution. This is not a catchable typed failure. Required constant execution reports an error when the assertion fails.

```carven
let index: usize = 1;
let values = [2, 4, 6];
let view = values.slice();
assert(index < view.length(), "index must be in bounds");
println(view[index]); // 4
```

Only a failing direct assertion evaluates its message expression; both source paths remain type-checked. Indirect callable invocation evaluates arguments eagerly under ordinary call rules. See [entries and tests](/reference/entry-testing/#assert) for reports and termination.

## Test functions

| Call form                       | Result | On failure                                       |
| ------------------------------- | ------ | ------------------------------------------------ |
| `check(condition[, message])`   | `void` | Record failure and continue the test             |
| `require(condition[, message])` | `void` | Record failure and stop the test                 |
| `fail([message])`               | `void` | Unconditionally record failure and stop the test |

The condition must be `bool`; an optional message is `str` or `String`. Brackets indicate optional parameters. Direct `check` and `require` evaluate messages only for a false condition. `fail` always evaluates its supplied message. These test functions require an active test context; executing them directly in an ordinary entry violates the runtime contract. Stopping crosses nested Carven calls and cleans up their scopes; it is not a typed failure consumed by `try` / `catch`.

```carven
fn twice(value: i32) -> i32 => value * 2;

test {
    check(twice(3) == 6);
    require(twice(0) == 0, "zero must stay zero");
}
```

Save as `main.cv` and run `carven --tests main.cv`. An unnamed test is identified by source location. Use `test "scenario" { ... }` when a descriptive name helps. Ordinary tests execute in test mode; `const test` executes during semantic checking with the same assertions, subject to compile-time admission and budgets. See [test declarations](/reference/entry-testing/#test-declarations).

## addressof

| Call form           | Result    | Requirement                   |
| ------------------- | --------- | ----------------------------- |
| `addressof(place)`  | `ptr<T>`  | Addressable Read storage      |
| `addressof(&place)` | `ptr<&T>` | Addressable, writable storage |

The storage selection evaluates once. A new address is known non-null; the pointer is nonowning and does not extend its target's lifetime. Literal temporaries, constant names, and Take expressions cannot supply an address. An immutable binding cannot provide a Write address.

```carven
var count = 1;
let writer = addressof(&count);
*writer += 1;
println(count); // 2
```

`addressof` requires a direct call and cannot be adapted to a callable value. Target lifetime and non-nullness are separate conditions when pointers cross calls. Providers and callers remain responsible for external storage validity. See [pointers and external addresses](/reference/pointers/#address-values-and-target-access).

## Text API

| Call or projection                | Receiver and parameters                      | Result                             |
| --------------------------------- | -------------------------------------------- | ---------------------------------- |
| `text.byte_length()`              | Read `str` or `String`                       | `usize`, UTF-8 byte count          |
| `text.is_empty()`                 | Read `str` or `String`                       | `bool`                             |
| `text.bytes`                      | Read `str` or `String`                       | Borrowed read-only `[u8]`          |
| `text.chars`                      | Read `str` or `String`                       | Read-only character-iteration view |
| `String::from_str(text)`          | Read `str`                                   | Independent owning `String`        |
| `text.as_str()`                   | Read `String`                                | Borrowed `str`                     |
| `text.append(source)`             | Write `String`; Read `str`                   | `void`                             |
| `text.append_format(f"...")`      | Write `String`; direct interpolation         | `void`                             |
| `text.push(scalar)`               | Write `String`; Read `char`                  | `void`                             |
| `text.clear()`                    | Write `String`                               | `void`                             |
| `char::from_u32_unchecked(value)` | Read `u32`, requiring a valid Unicode scalar | `char`                             |
| `str::from_utf8_unchecked(bytes)` | Read `[u8]`, requiring valid UTF-8           | Borrowed `str`                     |

```carven
var text: String = {};
text.append("hello");
text.push('!');
let view = text.as_str();
println(view, view.byte_length(), view.is_empty()); // hello! 6 false
```

Length counts bytes: `"我".byte_length()` is 3. Iterate characters through `.chars`. Saved text or byte views borrow their backing, preventing mutation of the source `String` while the borrow remains live. Receiver mutability comes from its variable or field; no extra `&` precedes the receiver of a member call. Members require direct calls and cannot be extracted as method values. See [text](/reference/text/) and [append formatting](/reference/formatting/#formatted-append).

The unchecked text factories do not validate native input: the caller must satisfy their content preconditions. Prefer checked [UTF library](/reference/utf/) functions for unvalidated input. Both unchecked factories support static execution and interpretation, where the executor checks their content preconditions and reports invalid content as an execution error rather than a typed failure. See [unchecked text construction](/reference/text/#unchecked-text-construction).

## Array and slice API

Arrays, owning `Vector<T>` values, and slices provide `length()`, `is_empty()`, `slice()`, and `slice(start, end)`. Arrays and vectors also create borrowed `[T]` views implicitly when a destination requires a slice.

| Call                     | Receiver and parameters                          | Result                    |
| ------------------------ | ------------------------------------------------ | ------------------------- |
| `values.length()`        | Read array, Vector, or `[T]`                     | `usize`, element count    |
| `values.is_empty()`      | Read array, Vector, or slice                     | `bool`                    |
| `values.slice()`         | Read array, Vector, or slice                     | Borrowed read-only `[T]`  |
| `view.slice(start, end)` | Read array, Vector, or slice; two `usize` bounds | Read-only half-open `[T]` |

```carven
let values = [2, 4, 6];
let view = values.slice();
let tail = view.slice(1, view.length());
println(tail.length(), tail[0]); // 2 4
```

A slice does not copy elements or extend its array's lifetime; a live borrow protects the backing. `slice(len, len)` is a valid empty range. Dynamic out-of-bounds access terminates; required constant execution diagnoses it. Indexing and iteration are language syntax; see [arrays](/reference/aggregates/#fixed-arrays), [slices](/reference/slices/), and [for](/reference/control/#for).

## SIMD primitives

`u8x16`, `u8x32`, `f32x4`, `f32x8`, and their masks provide APIs without imports. Vectors provide `splat`, `from_array`, `load`, `load_partial`, `to_array`, `lane`, `with_lane`, and `extract`. Masks provide `from_bits`, `prefix`, `bits`, `any`, `all`, `count`, `first_or`, and `select`. Byte vectors also provide `lookup`, `shift_left`, and `shift_right`. Floating vectors also provide static `swizzle`, finite checks, square root, absolute value, min, max, and clamp.

Float vectors also expose `is_finite`, `sqrt`, `abs`, `min`, `max`, and `clamp`; byte vectors expose `sum` and cross-width `lookup`. See the [SIMD reference](/reference/simd/) for signatures at each width, static inputs, bounds, and mathematical rules. `std::simd.bytes` and `std::simd.floats` are standard Crafts built on these primitives and require imports; see the [standard library reference](/reference/library/).

## Owning vectors and numeric parsing

`Vector<T>` is a default binding from `std::core`, distinct from fixed-width SIMD types. It supports empty/contextual literal construction, `new`, `with_capacity`, `from_slice`, `length`, `capacity`, `reserve`, `push`, `remove`, `clear`, and borrowed `slice`. Modification requires Write access; push can copy or Take an element. Live views prohibit storage-invalidating mutation. See [owning vectors](/reference/aggregates/#owning-vectors).

Scalar integers and floats expose checked `Type::parse(text)` with `NumberParseError` from `std::core`. Floating scalars provide finite checks, square root, absolute value, min, max, and clamp; see [types](/reference/types/). Checked `char::from_u32` and `str::from_utf8` select source declarations in `std::utf`.

## Async and host capabilities

Import cold composition, cancellation, and closure helpers from [std::async](/reference/async/). Import durations, clocks, waits, and timeout from [std::time](/reference/time/); `stdin` is available by default, with types and framing from [std::io](/reference/io/). These use ordinary failure and ownership contracts across supported static, interpreted, and native execution. Native TCP providers require a native host. The [standard capability index](/reference/library/) links the complete API references.
