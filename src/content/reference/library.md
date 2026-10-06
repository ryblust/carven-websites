---
title: "Standard library"
description: "Find every public UTF and SIMD Craft API, its signature, execution stage, and import path."
section: reference
lesson: 21
source: crafts/carven/std/README.md
---

## Choose a capability

The official `carven` Craft supplies seven public standard-library modules: five for Unicode and UTF-8, and two for SIMD algorithms. This page indexes their exported types, functions, and class operations. Use the [UTF reference](/reference/utf/) and [SIMD reference](/reference/simd/) for detailed contracts.

| Need                                          | Module                | API                                                                    |
| --------------------------------------------- | --------------------- | ---------------------------------------------------------------------- |
| Convert a Unicode scalar number               | `std::utf.scalar`     | `char_from_u32`, `UnicodeScalarError`                                  |
| Encode a character or decode one UTF-8 prefix | `std::utf.codec`      | `encode_utf8`, `decode_utf8_prefix`, `UTF8Encoded`, `UTF8DecodeResult` |
| Inspect a UTF-8 failure                       | `std::utf.error`      | `UTF8Error`, `UTF8ErrorKind`                                           |
| Validate a buffer or a stream of chunks       | `std::utf.validation` | `validate_utf8`, `UTF8Validator`                                       |
| Turn validated bytes into text                | `std::utf.text`       | `from_utf8`, `to_string`                                               |
| Scan and transform 32-byte blocks             | `std::simd.bytes`     | `ByteBlock`, byte search, ASCII classification, block loads and stores |
| Traverse and rearrange eight-float blocks     | `std::simd.floats`    | `FloatBlock`, block loads and stores, extraction and swizzling         |

The shipped `std::utf.scan` and `std::utf.block` modules implement the UTF algorithms inside the `carven` Craft. Their declarations have no `export` modifier and are not available to application modules. They are implementation dependencies rather than additional public APIs.

## Builtins and Crafts

| Layer                | Examples                                                                             | How to use it                                                                      |
| -------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Language builtins    | `println`, `assert`, `String`, text and slice operations, vector and mask primitives | Available without an import; see [built-in functions](/reference/builtins/)        |
| Standard Crafts      | Checked UTF conversion, UTF validation, byte search, SIMD block helpers              | Import an exported API from the appropriate `std::` module                         |
| Native C++ libraries | C++ standard-library containers and third-party libraries                            | Use [C++ interoperation](/reference/interop/) and supply native build dependencies |

Crafts are ordinary Carven source libraries. Their functions use the same types, Read/Write/Take rules, failure contracts, and admitted compile-time execution as application functions. Runtime support headers implement generated language operations; Carven source does not import those headers to use builtins.

## Import a module's API

Imports precede other declarations and statements. Select one name or several names:

```carven
import std::simd.bytes using { count_byte, find_byte };

const row = "name,age,city";
const commas = count_byte(row.bytes, 0x2c);

const test {
    check(commas == 2);
    check(find_byte(row.bytes, 0x2c) == 4);
}

println(commas);
```

This complete program prints `2`. The anonymous test runs during compilation. `std::` selects the official Craft: `std::simd.bytes` resolves to `crafts.carven.std.simd.bytes`. Plain `std.simd.bytes` selects a path in the current Craft domain.

The `carven`, `check`, `compile`, and `interpret` commands collect the official package from their Crafts roots. Import resolution then selects a module in that compilation batch. Names still require an explicit import, and only `export` declarations cross a Craft boundary. See [modules and imports](/reference/modules/) for source collection and visibility.

## Unicode scalar and UTF-8 APIs

### Types and failure payloads

| Module                | Type                 | Public contents                                                                               |
| --------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| `std::utf.scalar`     | `UnicodeScalarError` | Struct: `value: u32`, the rejected scalar number                                              |
| `std::utf.codec`      | `UTF8Encoded`        | Struct: `bytes: [u8; 4]`, `width: usize`; only the first `width` bytes belong to the encoding |
| `std::utf.codec`      | `UTF8DecodeResult`   | Enum: `End`, `Scalar(char, usize)`; the payload is a character and its byte width             |
| `std::utf.error`      | `UTF8ErrorKind`      | Enum: `InvalidLead`, `InvalidContinuation`, `Overlong`, `Surrogate`, `TooLarge`, `Truncated`  |
| `std::utf.error`      | `UTF8Error`          | Struct: `kind: UTF8ErrorKind`, `offset: usize`, `sequence_start: usize`                       |
| `std::utf.validation` | `UTF8Validator`      | Class with the six public operations listed below; validation state stays private             |

`UTF8Error` positions count bytes from zero in the logical stream. `offset` identifies the rejected byte, or the input end for truncation; `sequence_start` identifies the invalid sequence's beginning. Scalar conversion rejects U+D800 through U+DFFF and values above U+10FFFF.

### Conversion and whole-buffer validation

All arguments here use Read access. `throw` lists the typed failure that must be handled or propagated with `?`.

| Module                | Signature                                                                      | Execution and result                                                         |
| --------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `std::utf.scalar`     | `const fn char_from_u32(value: u32) -> char throw UnicodeScalarError`          | Check a scalar number and return a character                                 |
| `std::utf.codec`      | `const fn encode_utf8(character: char) -> UTF8Encoded`                         | Encode one character; unused array bytes are zero                            |
| `std::utf.codec`      | `const fn decode_utf8_prefix(bytes: [u8]) -> UTF8DecodeResult throw UTF8Error` | Empty input produces `.End`; otherwise decode only the first complete scalar |
| `std::utf.validation` | `const fn validate_utf8(bytes: [u8]) -> void throw UTF8Error`                  | Validate the whole buffer without allocating                                 |
| `std::utf.text`       | `fn from_utf8(bytes: [u8]) -> str throw UTF8Error`                             | Validate and borrow the same storage; runtime execution                      |
| `std::utf.text`       | `fn to_string(bytes: [u8]) -> String throw UTF8Error`                          | Validate and copy into independent owning storage; runtime execution         |

Choose `from_utf8` when you control the source storage's lifetime and can keep it unchanged. Choose `to_string` when the result should be stored or returned independently:

```carven
import std::utf.text using { from_utf8, to_string };

let bytes: [u8; 3] = [0xe6, 0x88, 0x91];
let borrowed = from_utf8(bytes)?;
let owned = to_string(bytes)?;

println(borrowed, owned);
```

Native execution prints `我 我`. The first result retains a checked borrow of `bytes`; the second owns an independent copy. Both calls preserve `UTF8Error` obligations. Arrays become byte slices in parameter context. The current interpreter, including Playground Run, rejects the unchecked text construction used internally by these two factories with `CV-INTERPRET-ADMISSION`; use native execution for this example.

### Incremental validator

These operations belong to `std::utf.validation.UTF8Validator`. Start with `UTF8Validator::create()`; the remaining calls use a validator value as their receiver.

| Signature                                         | Access and behavior                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| `UTF8Validator::create() -> UTF8Validator`        | Create a fresh validation attempt                                      |
| `state.push(byte: u8) -> void throw UTF8Error`    | Write receiver; accept one byte; rejection leaves the state unchanged  |
| `state.feed(bytes: [u8]) -> void throw UTF8Error` | Write receiver; accept a chunk; retain progress before a rejected byte |
| `state.check_complete() -> void throw UTF8Error`  | Read receiver; report a pending partial scalar at logical EOF          |
| `state.is_complete() -> bool`                     | Read receiver; test whether a partial scalar is pending                |
| `state.processed_bytes() -> usize`                | Read receiver; count accepted bytes                                    |

Use `var` for a receiver changed by `push` or `feed`. A chunk boundary is not EOF: a scalar may span chunks. `check_complete` does not consume or close the validator. It stores validation state rather than retaining input chunks. Copies start independent attempts with copies of that state. Class operations require runtime execution.

See [UTF streaming and error rules](/reference/utf/) for complete recovery and truncation examples. The public implementations are [scalar.cv](https://github.com/ryblust/carven/blob/main/crafts/carven/std/utf/scalar.cv), [codec.cv](https://github.com/ryblust/carven/blob/main/crafts/carven/std/utf/codec.cv), [error.cv](https://github.com/ryblust/carven/blob/main/crafts/carven/std/utf/error.cv), [validation.cv](https://github.com/ryblust/carven/blob/main/crafts/carven/std/utf/validation.cv), and [text.cv](https://github.com/ryblust/carven/blob/main/crafts/carven/std/utf/text.cv).

## Byte algorithms and block helpers

All functions in `std::simd.bytes` are `export const fn`: they support runtime calls and admitted compile-time execution. `ByteBlock` has `value: u8x32`, `active: mask32`, `offset: usize`, and `len: usize`. It owns the loaded lanes; `active` marks real input lanes and `len` is their count.

### Search and ASCII operations

| Signature                                          | Result                                                          |
| -------------------------------------------------- | --------------------------------------------------------------- |
| `count_byte(bytes: [u8], needle: u8) -> usize`     | Count occurrences throughout the slice                          |
| `find_byte(bytes: [u8], needle: u8) -> usize`      | First matching byte offset; return `bytes.len()` when absent    |
| `ascii_prefix(bytes: [u8]) -> usize`               | Length of the leading run of bytes below `0x80`                 |
| `first_or(mask: mask32, fallback: usize) -> usize` | Lowest active mask lane, or the fallback                        |
| `ascii_digit(bytes: u8x32) -> mask32`              | Mark ASCII `0` through `9`                                      |
| `ascii_whitespace(bytes: u8x32) -> mask32`         | Mark JSON whitespace: space, tab, LF, and CR                    |
| `ascii_lower(bytes: u8x32) -> u8x32`               | Change ASCII `A` through `Z` to lowercase; preserve other lanes |

These classify bytes, rather than performing Unicode case conversion. When applying a classification mask to a partial block, intersect it with `block.active` so zero-filled padding does not become input.

### Load and store

| Signature                                                                   | Contract                                                                   |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `block_count(bytes: [u8]) -> usize`                                         | Round the byte length up to 32-byte blocks without overflow                |
| `load_block(bytes: [u8], offset: usize) -> ByteBlock`                       | Read at most 32 bytes, zero-fill the rest; require `offset <= bytes.len()` |
| `store(value: u8x32, &destination: [u8; 32]) -> void`                       | Replace every destination element                                          |
| `store_partial(value: u8x32, &destination: [u8; 32], count: usize) -> void` | Replace only the first `count` elements; require `count <= 32`             |

Stores require Write access to a fixed array, so call them with `&destination`. A read-only slice cannot be a store destination. A load at the input end returns a block with no active lanes.

### Static rearrangement controls

| Signature                                                                | Contract                                                                                                 |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `extract(left: u8x32, right: u8x32, const offset: usize) -> u8x32`       | Select 32 lanes from the concatenated vectors; `offset` is in `0..=32`                                   |
| `shift_in(previous: u8x32, current: u8x32, const count: usize) -> u8x32` | Prepend the final `count` previous bytes to the first `32 - count` current bytes; `count` is in `0..=32` |
| `shift_left(value: u8x32, const count: usize) -> u8x32`                  | Shift each byte left by `0..7` bits with zero fill                                                       |
| `shift_right(value: u8x32, const count: usize) -> u8x32`                 | Shift each byte right by `0..7` bits with zero fill                                                      |
| `swizzle(value: u8x32, const indices: [u8; 32]) -> u8x32`                | Select a source lane for each result lane; every index is below 32                                       |

The controls marked `const` must be static arguments. An ordinary `let` or runtime loop index does not qualify; forwarding wrappers repeat `const` in their parameter declaration. See [static parameters](/reference/functions/#static-parameters) and the [byte implementation](https://github.com/ryblust/carven/blob/main/crafts/carven/std/simd/bytes.cv).

## Floating block helpers

All six functions in `std::simd.floats` are `export const fn`. `FloatBlock` has `value: f32x8`, `active: mask8`, `offset: usize`, and `len: usize`. Offsets and lengths count float elements, rather than bytes.

| Signature                                                                   | Contract                                                                                |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `block_count(values: [f32]) -> usize`                                       | Round the element count up to eight-element blocks without overflow                     |
| `load_block(values: [f32], offset: usize) -> FloatBlock`                    | Read at most eight elements, fill the rest with `0.0`; require `offset <= values.len()` |
| `extract(left: f32x8, right: f32x8, const offset: usize) -> f32x8`          | Select eight lanes from concatenated vectors; `offset` is in `0..=8`                    |
| `swizzle(value: f32x8, const indices: [u8; 8]) -> f32x8`                    | Select a source lane for each result lane; every index is below eight                   |
| `store(value: f32x8, &destination: [f32; 8]) -> void`                       | Replace all eight destination elements                                                  |
| `store_partial(value: f32x8, &destination: [f32; 8], count: usize) -> void` | Replace only the first `count` elements; require `count <= 8`                           |

```carven
import std::simd.floats using { load_block, store_partial };

let values: [f32; 3] = [1.0, 2.0, 3.0];
let block = load_block(values, 0);
var result: [f32; 8] = {};
store_partial(block.value * 2.0, &result, block.len);

println(result[0], result[1], result[2], block.active.count());
```

The output is `2 4 6 3`. Only three result elements are written; the other five retain their default zero values. Primitive arithmetic follows scalar `f32` rules per lane. Horizontal reductions and fused operations are currently unavailable. See the [floating implementation](https://github.com/ryblust/carven/blob/main/crafts/carven/std/simd/floats.cv) and [SIMD execution rules](/reference/simd/).

## Compile and run library code

`const fn` makes a function eligible for compile-time execution. An ordinary runtime call stays a runtime call; a `const` initializer, block, or test explicitly requests the static stage. UTF text factories and the incremental validator require runtime execution. Static execution has the language's ordinary step, depth, and storage budgets.

Generated C++ uses the matching runtime headers. A manual native build compiles the generated Craft implementations as well as application files. SIMD and runtime text support must use consistent backend flags across translation units. See [toolchain build responsibilities](/reference/toolchain/) and the [runtime and Craft boundary](/internals/runtime-boundary/).

The [standard Craft source overview](https://github.com/ryblust/carven/blob/main/crafts/carven/std/README.md) describes the shipped package. Future proposals do not add APIs to this index until their implementations are available.
