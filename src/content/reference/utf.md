---
title: "The UTF standard library"
description: "Scalar conversion, UTF-8 encoding and decoding, owning and borrowed text, and incremental validation."
section: reference
lesson: 19
source: crafts/carven/std/utf/README.md
---

## Modules and interfaces

The build system adds standard-library modules to the input batch. Select capabilities with imports such as `import std::utf.text using to_string;`.

| Module              | Contents                                                |
| ------------------- | ------------------------------------------------------- |
| std::utf.scalar     | UnicodeScalarError and scalar conversion                |
| std::utf.codec      | UTF8Encoded, UTF8Decode, prefix decoding, and encoding  |
| std::utf.validation | UTF8ErrorKind, UTF8Error, UTF8Validator, and validation |
| std::utf.text       | Borrowed and owning text construction                   |

| Operation                                                    | Result                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| `validate_utf8(bytes: [u8]) throw UTF8Error`                 | Validate all input without allocation                        |
| `from_utf8(bytes: [u8]) -> str throw UTF8Error`              | Validate, then borrow the same storage                       |
| `to_string(bytes: [u8]) -> String throw UTF8Error`           | Validate, then make an independent copy                      |
| `decode_utf8(bytes: [u8]) -> UTF8Decode throw UTF8Error`     | End for empty input; otherwise the first Scalar(char, usize) |
| `encode_utf8(character: char) -> UTF8Encoded`                | Four-byte bytes array and effective width                    |
| `char_from_u32(value: u32) -> char throw UnicodeScalarError` | Validate the scalar range                                    |
| `char_to_u32(value: char) -> u32`                            | Scalar number                                                |
| `validator() -> UTF8Validator`                               | Fresh validation state                                       |
| `push(&state, byte: u8) throw UTF8Error`                     | Accept one byte                                              |
| `feed(&state, bytes: [u8]) throw UTF8Error`                  | Accept a chunk                                               |
| `finish(state) throw UTF8Error`                              | Declare logical EOF                                          |

Arrays can implicitly become byte slices or use explicit as_slice. Text `.bytes` supplies a slice. from_utf8 borrows its input, so the backing must remain alive and unchanged. to_string produces an independent result that can safely be returned from a local array.

```carven
import std::utf.text using to_string;
import std::utf.validation using UTF8Error;

fn text() -> String throw UTF8Error {
    let bytes: [u8; 4] = [0xf0, 0x9f, 0x98, 0x80];
    return to_string(bytes)?;
}
```

## Error locations

UTF8Error contains kind, offset, and sequence_start. Offsets are zero-based byte positions in the logical stream. offset identifies the rejected byte, or the end for EOF truncation. sequence_start identifies the invalid sequence's beginning; preceding bytes form a valid prefix.

Kinds are InvalidLead, InvalidContinuation, Overlong, Surrogate, TooLarge, and Truncated. C0/C1 and F5..FF report InvalidLead. Empty input, embedded NUL, and Unicode noncharacters are valid. There is no normalization or replacement decoding. Prefix decoding does not inspect bytes after the first complete scalar.

## Incremental protocol

Initialize with validator and modify with push/feed. State tracks byte positions and incomplete sequences without retaining input. A rejected push leaves state unchanged. A rejected feed preserves progress for previously accepted bytes. End the current validation attempt after an error; changing bytes and retrying describes a different stream.

A chunk boundary is not EOF. An incomplete sequence can span chunks; only finish reports truncation. The total logical stream length must fit usize.
