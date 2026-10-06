---
title: "The UTF standard library"
description: "Scalar conversion, UTF-8 encoding and decoding, owning and borrowed text, and incremental validation."
section: reference
lesson: 22
source: crafts/carven/std/utf/README.md
---

## Modules and interfaces

The `carven`, `check`, `compile`, and `interpret` commands collect the official library sources automatically. Select capabilities with imports such as `import std::utf.text using to_string;`.

| Module              | Contents                                                     |
| ------------------- | ------------------------------------------------------------ |
| std::utf.scalar     | UnicodeScalarError and scalar conversion                     |
| std::utf.codec      | UTF8Encoded, UTF8DecodeResult, prefix decoding, and encoding |
| std::utf.validation | UTF8Validator and whole-buffer validation                    |
| std::utf.error      | Shared UTF8ErrorKind and UTF8Error                           |
| std::utf.text       | Borrowed and owning text construction                        |

| Operation                                                             | Result                                                           |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `validate_utf8(bytes: [u8]) throw UTF8Error`                          | Validate all input without allocation                            |
| `from_utf8(bytes: [u8]) -> str throw UTF8Error`                       | Validate, then borrow the same storage                           |
| `to_string(bytes: [u8]) -> String throw UTF8Error`                    | Validate, then make an independent copy                          |
| `decode_utf8_prefix(bytes: [u8]) -> UTF8DecodeResult throw UTF8Error` | End for empty input; otherwise the first Scalar(`char`, `usize`) |
| `encode_utf8(character: char) -> UTF8Encoded`                         | Four-byte bytes array and effective width                        |
| `char_from_u32(value: u32) -> char throw UnicodeScalarError`          | Validate the scalar range                                        |
| `character as u32`                                                    | Scalar number                                                    |
| `UTF8Validator::create() -> UTF8Validator`                            | Fresh validation state                                           |
| `state.push(byte: u8) throw UTF8Error`                                | Accept one byte                                                  |
| `state.feed(bytes: [u8]) throw UTF8Error`                             | Accept a chunk; its end is not EOF                               |
| `state.check_complete() throw UTF8Error`                              | Check completeness without ending the stream                     |
| `state.processed_bytes() -> usize`                                    | Accepted byte count                                              |
| `state.is_complete() -> bool`                                         | Whether no partial scalar is pending                             |

Arrays can implicitly become byte slices or use explicit as_slice. Text `.bytes` supplies a slice. from_utf8 borrows its input, so the backing must remain alive and unchanged. to_string produces an independent result that can safely be returned from a local array.

```carven
import std::utf.text using to_string;
import std::utf.error using UTF8Error;

fn text() -> String throw UTF8Error {
    let bytes: [u8; 4] = [0xf0, 0x9f, 0x98, 0x80];
    return to_string(bytes)?;
}
```

## Compile-time use

`char_from_u32`, `encode_utf8`, `decode_utf8_prefix`, and `validate_utf8` are const fn. The same Carven implementation runs at compilation and in ordinary runtime calls; encoded arrays can become frozen constant slices.

```carven
import std::utf.codec using { encode_utf8, decode_utf8_prefix, UTF8DecodeResult };
import std::utf.validation using validate_utf8;

const encoded = encode_utf8('😀');
const bytes: [u8] = encoded.bytes;
const {
    validate_utf8(bytes.slice(0, encoded.width))?;
    assert(encoded.width == 4);
}
const decoded = decode_utf8_prefix(bytes.slice(0, encoded.width))?;
const test "UTF round trip" {
    match decoded {
        .Scalar(value, width) => {
            check(value == '😀');
            check(width == 4);
        },
        .End => fail("missing scalar"),
    }
}
```

UTF8Encoded.bytes always has four bytes. Only its first width bytes form the encoding; the rest are zero. Keep width when making a byte view, or padding introduces extra NUL scalars. Static calls follow ordinary typed-failure contracts and execution budgets.

`from_utf8` and `to_string` require runtime execution because unchecked borrowed text construction is not admitted by the executor. `UTF8Validator` is also runtime-only because class values are outside static execution. Whole-buffer validation uses internal struct state. Native UTF validation and the SIMD craft share the selected backend; see [SIMD requirements](/reference/simd/#types-and-backends).

## Error locations

UTF8Error contains kind, offset, and sequence_start. Offsets are zero-based byte positions in the logical stream. offset identifies the rejected byte, or the end for EOF truncation. sequence_start identifies the invalid sequence's beginning; preceding bytes form a valid prefix.

Kinds are InvalidLead, InvalidContinuation, Overlong, Surrogate, TooLarge, and Truncated. C0/C1 and F5..FF report InvalidLead. Empty input, embedded NUL, and Unicode noncharacters are valid. There is no normalization or replacement decoding. Prefix decoding does not inspect bytes after the first complete scalar.

## Incremental protocol

`UTF8Validator` is a [class](/reference/aggregates/#ordinary-value-classes): start with `UTF8Validator::create()` and change it through the Write operations `push` and `feed`. Its private fields track byte positions and the incomplete sequence without retaining input; `state.state` outside the class reports `CV-ACCESS-CLASS-PRIVATE`. `check_complete`, `processed_bytes`, and `is_complete` use Read access, so checking completeness neither consumes nor closes the validator; later input is permitted. A rejected push leaves state unchanged. A rejected feed preserves progress for previously accepted bytes. End the current validation attempt after an error; changing bytes and retrying describes a different stream.

A chunk boundary is not EOF. An incomplete sequence can span chunks; only check_complete reports truncation. The total logical stream length must fit `usize`.

```carven
import std::utf.validation using UTF8Validator;
import std::utf.error using UTF8Error;

let bytes: [u8; 2] = [0x41, 0xe6];
var state = UTF8Validator::create();
try {
    state.feed(bytes)?;
    state.check_complete()?;
} catch {
    UTF8Error(error) => println(error),
}
println(state.processed_bytes());
```

The chunk ends inside a three-byte sequence, so `feed` succeeds and `check_complete` reports truncation:

```text
UTF8Error {
    kind: UTF8ErrorKind::Truncated,
    offset: 2,
    sequence_start: 1,
}
2
```
