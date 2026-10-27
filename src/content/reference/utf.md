---
title: "UTF-8 and text processing"
description: "Validate, decode, borrow, split, and own Unicode text in every supported execution stage."
section: reference
lesson: 21
source: docs/language/utf.md
---

Use `std::utf` when byte input needs to become valid text, or when text needs splitting and slicing. UTF-8 uses one to four bytes for each Unicode scalar, so byte offsets and scalar counts differ. A visible character can contain several scalars. The API states whether it returns an independent String or a view that still borrows the input.

## Public text types

Import these declarations from `std::utf` when naming them. Struct fields are public. `UTF8ErrorKind` and `TextError` are numeric enums with the default `i32` underlying type; `UTF8DecodeResult` and `TextSplitField` are payload enums.

| Type                 | Fields or cases                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `UnicodeScalarError` | `value: u32`                                                                                   |
| `UTF8Error`          | `kind: UTF8ErrorKind`, `offset: usize`, `sequence_start: usize`                                |
| `UTF8ErrorKind`      | Nullary `InvalidLead`, `InvalidContinuation`, `Overlong`, `Surrogate`, `TooLarge`, `Truncated` |
| `UTF8Encoded`        | `bytes: [u8; 4]`, `width: usize`                                                               |
| `UTF8DecodeResult`   | `End`, `Scalar(char, usize)`; scalar and encoded byte width                                    |
| `TextError`          | Nullary `OutOfBounds`, `NotCharBoundary`, `EmptySeparator`                                     |
| `TextSplit`          | `found: bool`, `before: str`, `after: str`                                                     |
| `TextSplitField`     | `Value(str)`, `End`                                                                            |

`UTF8Validator` and `TextSplitCursor` are source classes with private state. Their constructors and methods appear below.

## Encoding, decoding, and validation

Import types and functions from `std::utf`.

Use `char::from_u32(value)` to construct a Unicode scalar and
`str::from_utf8(bytes)` to construct a borrowed text view. These associated
entries select ordinary source functions from `std::utf`. Import `char_from_u32`
or `from_utf8` from that module to call the same declaration directly. The associated forms require direct calls; use an imported function name when a callable value is needed.
`char_from_u32` rejects surrogates and values above U+10FFFF with
`UnicodeScalarError { value }`. `from_utf8` validates the complete byte slice,
throws `UTF8Error` on invalid input, and otherwise borrows the unchanged storage.
Empty input is valid; keep the backing alive while using the view.

| Operation                                                             | Result                                                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `char_from_u32(value: u32) -> char throw UnicodeScalarError`          | Checked scalar; same declaration as `char::from_u32`                                        |
| `from_utf8(bytes: [u8]) -> str throw UTF8Error`                       | Checked borrowed view; same declaration as `str::from_utf8`                                 |
| `validate_utf8(bytes: [u8]) -> void throw UTF8Error`                  | Validate the entire input without allocation                                                |
| `to_string(bytes: [u8]) -> String throw UTF8Error`                    | Validate and copy into independent storage                                                  |
| `decode_utf8_prefix(bytes: [u8]) -> UTF8DecodeResult throw UTF8Error` | `.End` for empty input; otherwise `.Scalar(char, usize)` for the first scalar and its width |
| `encode_utf8(character: char) -> UTF8Encoded`                         | Four-byte array `bytes` and valid `width`                                                   |
| `encoded_bytes(encoded: UTF8Encoded) -> [u8]`                         | Borrow exactly the valid encoding prefix                                                    |
| `UTF8Validator::new() -> UTF8Validator`                               | Start an incremental validation attempt                                                     |
| `state.push(byte: u8) -> void throw UTF8Error`                        | Accept one byte                                                                             |
| `state.feed(bytes: [u8]) -> void throw UTF8Error`                     | Accept one block; its end is not EOF                                                        |
| `state.check_complete() -> void throw UTF8Error`                      | Check that no partial scalar remains; does not end the stream                               |

`UTF8Validator::new()` creates the validator used as `state`. `push` and `feed` require Write access; `check_complete` uses Read access. Its additional Read queries are `state.processed_bytes() -> usize` and `state.is_complete() -> bool`; neither has a typed failure.

Array arguments create byte views implicitly; text exposes them through `.bytes`.
Use `str::from_utf8` when the caller controls the backing lifetime and a copy is
unnecessary.

```carven run
import std::utf using { to_string, UTF8Error }

fn main() throw UTF8Error {
    let bytes: [u8; 4] = [0xf0, 0x9f, 0x98, 0x80];
    let text = to_string(bytes)?;
    println(text); // 😀
}
```

## Text processing

`std::utf` reuses `str`, `String`, slices, and ordinary typed failures.
All operations below are `const fn` and also run at runtime.

| Operation                                                               | Result and ownership                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `substring(text: str, start: usize, end: usize) -> str throw TextError` | Borrow `[start, end)` UTF-8 bytes; both offsets must be scalar boundaries                               |
| `starts_with(text: str, prefix: str) -> bool`                           | Compare the prefix without allocation                                                                   |
| `ends_with(text: str, suffix: str) -> bool`                             | Compare exact suffix bytes; an empty suffix matches                                                     |
| `split_once(text: str, separator: str) -> TextSplit throw TextError`    | Borrow `before` and `after`; `found` distinguishes a separator from an absent one                       |
| `split(text: str, separator: str) -> Vector<String> throw TextError`    | Independent owning fields, including leading, adjacent, and trailing empty fields                       |
| `lines(text: str) -> Vector<String>`                                    | Independent lines delimited by LF or CRLF, including empty lines; no extra line after a final delimiter |

Substring offsets count bytes, not Unicode scalars or grapheme clusters. A
reversed or out-of-range selection reports `TextError::OutOfBounds`; an offset
inside a scalar reports `NotCharBoundary`. Splitting uses an exact, nonempty
UTF-8 separator and reports `EmptySeparator` for an empty separator. It performs
no whitespace normalization. An absent separator returns `found: false`, the
entire input as `before`, and an empty `after`.

`TextSplit` and substring results borrow the original input, including results
returned through helper functions. Their lifetimes and mutations follow ordinary
ownership checks. `split` and `lines` return owners and copy the fields, so callers
can retain the collection independently of the input. Empty text yields one empty
split field and zero lines. A lone CR is content; only CR immediately before LF is
stripped.

```carven
import std::utf using { split_once, TextError }

fn setting(text: str) -> String throw TextError {
    let pair = split_once(text, "=")?;
    return if pair.found { pair.after as String } else { "" };
}
```

## Static execution

All source functions and methods on this page are `const fn`. [Constant result and budget rules](/reference/constants/) apply. An encoding array can supply a retained constant slice:

```carven
import std::utf using { encode_utf8, encoded_bytes, validate_utf8 }

const encoded = encode_utf8('😀');
const bytes = encoded_bytes(encoded);

const { validate_utf8(bytes)?; }
```

`encode_utf8` returns four bytes in `UTF8Encoded.bytes`; only the first `width` bytes belong to the encoding, and the remainder is zero. Because the fields are public, a manually constructed encoding must satisfy `1 <= width <= 4` before calling `encoded_bytes`; a violation terminates at runtime or fails static execution. `encoded_bytes` checks that width, not UTF-8 validity. `encoded_bytes(encoded)` borrows that
prefix. Bind the encoding before retaining its view; the usual backing lifetime
and mutation checks apply.

## Error and streaming contract

`UTF8Error` contains `kind`, `offset`, and `sequence_start`. Positions are
zero-based byte offsets in the logical stream. `offset` identifies the rejected
byte; EOF truncation points at the input end. `sequence_start` identifies the
start of the invalid sequence, so bytes before it form a valid prefix.
`UTF8Error` and `UTF8ErrorKind` are ordinary source declarations from `std::utf`.
Text construction, library algorithms, and standard input use the same error
values.

Illegal lead bytes C0/C1 and F5..FF report
`InvalidLead`. Empty input, embedded NUL, and Unicode noncharacters are valid.
There is no normalization or replacement decoding. Prefix decoding does not
inspect bytes after the first complete scalar.

A rejected `push` leaves the state unchanged. A rejected `feed` preserves the
progress of accepted bytes before the rejection. Stop that validation attempt on error;
retrying with different bytes describes a different stream. An incomplete block
is accepted, and only `check_complete` reports truncation. Logical stream length
must fit `usize`.

Copies of a validator are independent validation attempts.
Initialize `UTF8Validator` through `UTF8Validator::new()` and change it through
`push` or `feed`. It stores no input. `processed_bytes()` returns the accepted byte count,
and `is_complete()` reports whether no partial scalar is pending. Both queries
and `check_complete()` use Read access; checking completeness does not consume
or close the validator. Call it at logical EOF to detect truncation; subsequent
input is still permitted.

## Borrowed splitting cursor

| Call                                     | Access and result                                                   |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `TextSplitCursor::new()`                 | New `TextSplitCursor`; no typed failure                             |
| `cursor.next(text: str, separator: str)` | Write cursor; `TextSplitField` borrowing `text`; throws `TextError` |

`TextSplitCursor::new()` creates an offset-only cursor. Call
`cursor.next(text, separator)?` explicitly; `TextSplitField::Value(str)` borrows the
original input, while `TextSplitField::End` marks exhaustion. Empty input yields one
empty field, and leading, adjacent, and trailing empty fields are preserved.
Separators may contain multiple UTF-8 bytes; an empty separator reports
`TextError::EmptySeparator`, including after exhaustion.

Keep the same text and separator for a traversal. The cursor owns no text and
cannot identify a replacement input. Returned fields require the original backing
to remain alive and valid. Copies of a cursor traverse independently from the
same offset. The cursor and its methods support static execution.
