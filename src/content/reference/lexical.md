---
title: "Lexical syntax and literals"
description: "Source encoding, identifiers, comments, numbers, text, C++ fragments, and syntactic disambiguation."
section: reference
lesson: 1
source: docs/grammar.md
---

## Source text

Carven source text is UTF-8. Identifiers use ASCII: a letter or `_` first, followed by letters, digits, or `_`. Chinese characters may appear in comments, strings, and C++ header names. Naming style does not change syntactic validity.

Whitespace includes spaces, tabs, LF, CR, and CRLF. Line comments run from `//` to the line end. Ordinary Carven source has no block comments. A `#[cpp]` payload is treated as opaque bytes.

Reserved keywords:

```text
as break catch const continue else enum export false fn for if import in is let
match nullptr private rethrow return struct test throw true try using var while
```

Spellings without language productions, such as `new` and `delete`, remain ordinary identifiers. `_` discards in binding positions; `_name` is an ordinary name.

## Numbers

| Form                 | Examples                 |
| -------------------- | ------------------------ |
| Decimal integer      | `42`, `42i64`, `10usize` |
| Hexadecimal          | `0xff`, `0XFFu32`        |
| Binary               | `0b1010`                 |
| Octal                | `0o17`                   |
| Decimal fraction     | `1.25`, `1.25f32`        |
| Exponent             | `1e3`, `1.5E-2`          |
| Floating suffix only | `1f32`, `1f64`           |

Signs are prefix operators. Suffixes immediately follow the literal. Integer suffixes are `i8/i16/i32/i64/isize/u8/u16/u32/u64/usize`; floating suffixes are `f32/f64`. There are no C++ `f`, `l`, or `ul` suffixes or digit separators. A decimal-point form requires decimal digits on both sides of the point.

## Characters and strings

Character literals use single quotes and decode to exactly one Unicode scalar. Ordinary strings use double quotes. Escapes are `\'`, `\"`, `\\`, `\n`, `\t`, `\r`, `\0`, and `\u{...}`. Unicode escapes contain one to six hexadecimal digits, at most U+10FFFF, excluding surrogates U+D800..U+DFFF. There is no `\xNN`, `\uXXXX`, or `\UXXXXXXXX`.

A literal ends on the line where it begins. No Unicode normalization occurs. Adjacent strings do not concatenate automatically.

```carven
const scalar = '我';
const text = "第一行\n第二行";
const nul = "a\0b";
```

The c in `c"..."` must touch the quote. The result is native `const char*`; decoded interior NUL is invalid. `c "..."` is not one literal. There is no raw form.

`f"..."` is an interpolation expression producing String. `{{` and `}}` represent literal braces. Holes contain ordinary expressions and optional `:` format specifications; dynamic width and precision also use holes. Only a top-level hole colon not belonging to `::` begins a format specification. Holes may contain parentheses, strings, nested interpolation, and ordinary newlines. Empty holes are invalid. Decoded escapes are not rescanned as interpolation delimiters.

## C++ headers and source fragments

After import, `<...>` or `"..."` is a dedicated nonempty header-name token. Whitespace or line comments may intervene. Header names do not decode escapes, interpolate, or span lines.

```carven
import <cstdint>;

#[cpp] ---
int native_answer() {
    return 42;
}
---
```

`#[cpp]` permits no internal whitespace. It is followed by at least one space or tab, at least three hyphens, then a newline. The closing fence occupies its own line, may be indented, and has exactly as many hyphens as the opening fence. A matching line closes the fragment even if it appears inside a C++ string or comment. The payload may be empty. No semicolon follows the fence.

## Delimiters and disambiguation

Module imports form a contiguous prefix at the start of a file. A function block body has no trailing semicolon; `=> expression;` does. Bindings, assignments, transfers, and ordinary expression statements end in semicolons. Value branches of if, match, and try yield a final expression; this is not an implicit return from an ordinary function block.

Assignment and increment/decrement are statement actions, not expressions. Increment/decrement use prefix form. There are no standalone `{ ... }` block statements, tuples, or type-alias declarations. `&` and `&&` mark access in parameter and argument positions. In ordinary expressions, `&&` may mean Take or binary logical and according to position. Lexing uses maximal munch; type parsing handles consecutive `>` in template types.

`..` and `..=` are each recognized as one maximal-munch token, denoting half-open and closed ranges. Range expressions require both bounds; omitted bounds are allowed only in range patterns.
