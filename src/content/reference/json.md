---
title: "JSON values and serialization"
description: "Parse, construct, modify, and retain owned JSON trees with precise typed failures."
section: reference
lesson: 30
source: docs/language/json.md
---

`Value::parse` turns JSON text into a tree of values you can inspect and modify. The tree owns its strings and child values, so it remains valid after the input text is released. `to_json` writes the tree back to a `String`.

## Public types

All names below come from `std::json`. `Value` is an owning class; its fields are private. The other types are ordinary source declarations. `JSONErrorKind` and `ValueError` are numeric enums with the default `i32` underlying type; their listed cases have consecutive values starting at zero.

| Type            | Public data or cases                                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ValueKind: u8` | `Null = 0`, `Boolean = 1`, `Number = 2`, `String = 3`, `Array = 4`, `Object = 5`                                                                                  |
| `JSONError`     | `kind: JSONErrorKind`, `offset: usize`                                                                                                                            |
| `JSONErrorKind` | Nullary `UnexpectedEnd`, `UnexpectedByte`, `InvalidEscape`, `InvalidHex`, `UnpairedSurrogate`, `ControlCharacter`, `InvalidNumber`, `TrailingInput`, `DepthLimit` |
| `ValueError`    | Nullary `WrongKind`, `MissingKey`, `IndexOutOfBounds`, `NumberConversion`, `DepthLimit`                                                                           |

## Parsing and writing

Import value types, errors, and functions from `std::json`.

| Operation                                  | Result                                          | Failure                  |
| ------------------------------------------ | ----------------------------------------------- | ------------------------ |
| `Value::parse(text: str) -> Value`         | Independent value tree                          | `JSONError`              |
| `Value::parse_bytes(bytes: [u8]) -> Value` | Validate UTF-8, then return an independent tree | `UTF8Error`, `JSONError` |
| `value.to_json() -> String`                | Independent, compact JSON `String`              | `ValueError`             |

`parse` and `parse_bytes` are associated functions; `to_json` uses a Read receiver. Any JSON value may be the root. Byte parsing checks the entire input's UTF-8
encoding first, so an encoding error takes precedence over a JSON syntax error.

```carven
import std::json using { Value, JSONError, ValueError };

fn update(text: str) -> String throw JSONError + ValueError {
    var config = Value::parse(text)?;
    config.set("enabled", &&Value::boolean(true))?;
    config.set("attempts", &&Value::integer(3))?;
    return config.to_json()?;
}
```

## Values and collections

All factories return `Value`:

| Factory                                                             | Input and failure                                               |
| ------------------------------------------------------------------- | --------------------------------------------------------------- |
| `Value::null()`, `Value::array()`, `Value::object()`                | Empty value of the selected kind                                |
| `Value::boolean(value: bool)`, `Value::string(text: str)`           | Store a boolean or an independent text copy                     |
| `Value::number(text: str)`                                          | Exactly one JSON number spelling; throws `JSONError`            |
| `Value::integer(value: i64)`, `Value::unsigned_integer(value: u64)` | Exact integer value                                             |
| `Value::real(value: f64)`                                           | Finite floating value; otherwise `ValueError::NumberConversion` |

### Value queries

| Read method           | Result                                        | Failure                                       |
| --------------------- | --------------------------------------------- | --------------------------------------------- |
| `value.kind()`        | `ValueKind`                                   | None                                          |
| `value.as_bool()`     | `bool`                                        | `ValueError::WrongKind`                       |
| `value.as_str()`      | Borrowed `str`                                | `ValueError::WrongKind`                       |
| `value.number_text()` | Borrowed `str` containing the number spelling | `ValueError::WrongKind`                       |
| `value.as_i64()`      | `i64`                                         | `ValueError::WrongKind` or `NumberConversion` |
| `value.as_u64()`      | `u64`                                         | `ValueError::WrongKind` or `NumberConversion` |
| `value.as_f64()`      | `f64`                                         | `ValueError::WrongKind` or `NumberConversion` |

Collection access and mutation are listed below.

### Array and object methods

All methods in this table can throw `ValueError`. `push`, `set_at`, `remove_at`, `set`, `append_member`, and `erase` require a Write receiver; the remaining methods use Read access. Keys stored by `set` and `append_member` own their text.

| Operation                                                                                                                             | Result                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `value.length() -> usize`                                                                                                             | Array element or object member count                             |
| `value.at(index: usize) -> Value` / `value.get(key: str) -> Value`                                                                    | Independent child value                                          |
| `value.push(&&child: Value) -> void` / `value.set_at(index: usize, &&child: Value) -> void` / `value.remove_at(index: usize) -> void` | Append, replace, or remove an array element                      |
| `value.has(key: str) -> bool`                                                                                                         | Whether an object contains the key                               |
| `value.set(key: str, &&child: Value) -> void` / `value.append_member(key: str, &&child: Value) -> void`                               | Replace or append an object member                               |
| `value.erase(key: str) -> usize`                                                                                                      | Remove every matching member and return the removed count        |
| `value.key_at(index: usize) -> str` / `value.member_value_at(index: usize) -> Value`                                                  | Borrowed key or independent value at an object's member position |

`length` accepts arrays or objects. `at`, `push`, `set_at`, and `remove_at` require an array; `has`, `get`, `set`, `append_member`, `erase`, `key_at`, and `member_value_at` require an object. An incompatible kind reports `WrongKind`. Indexed methods report `IndexOutOfBounds` when `index >= length()`; `get` reports `MissingKey` for an absent key, while `has` returns false and `erase` returns zero. `remove_at` destroys the removed child and returns `void`.

Objects retain member order and duplicate keys. `get` selects the last matching
member, `set` replaces that member or appends a new one, and `erase` removes
all matching members. Child access returns an independent value. Copies can
be modified independently; modifying a child copy requires assigning it back
to its parent.

`as_str`, `number_text`, and `key_at` return borrowed `str` views. Keep the value
alive and unchanged while using a view; conflicting mutation and escaping borrows
are rejected. Copy with `as String` when the text needs an independent lifetime.
For a `config` with a `name` member, bind the child returned by `get` before retaining its text view:

```carven
let child = config.get("name")?;
let name = child.as_str()?;
let saved = name as String;
```

## Numbers

Numbers retain their validated spelling. Reading
and writing preserves large magnitudes such as `1E400`, integer precision,
negative zero, and exponent spelling. `as_i64` requires integer spelling and a
representable result; `as_u64`
additionally requires nonnegative spelling. `as_f64` permits rounding but rejects
out-of-range results. `number_text` returns the original spelling.
Numeric conversion failures report `ValueError::NumberConversion` without an
input byte offset. Conversions use the entire number spelling.

## Validation and failures

| Function                              | Result and failures                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `validate(text: str) -> void`         | Check one complete JSON value; throws `JSONError`                                                           |
| `validate_bytes(bytes: [u8]) -> void` | Check UTF-8, then JSON; throws `UTF8Error` or `JSONError`                                                   |
| `decode_string(text: str) -> String`  | Decode exactly one quoted string without surrounding whitespace into an owning `String`; throws `JSONError` |

See [UTF8Error](/reference/utf/#error-and-streaming-contract) for encoding failures and byte positions.

Whitespace is space, tab, LF, or CR. Escaped surrogate pairs decode to Unicode
scalars; unpaired surrogates are rejected. Input nesting and writing are limited
to 64 containers. Writing escapes quotes, backslashes, and control characters;
other Unicode scalars are written as UTF-8. Writing preserves member order and
number spelling and does not normalize or sort them.

`JSONError.offset` is a zero-based input byte offset. `UnexpectedEnd` points at
the input length; `UnpairedSurrogate` points at the offending backslash.
Error cases are listed under [public types](#public-types).

## Static execution

Validation, parsing, value construction, text queries, mutation, decoding, and
writing are `const fn` operations. They use ordinary execution budgets and the
same ownership and failure rules as runtime calls. With `Value` imported, for example:

```carven
const compact = Value::parse(r#"{ "enabled": true }"#)?.to_json()?;
```

Completed `String` results retain their owning type. JSON values can also be
retained as constants, including their nested strings, arrays, and object members.
Copying a retained value creates independent mutable contents.
