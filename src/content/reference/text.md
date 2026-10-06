---
title: "Characters, str, and String"
description: "UTF-8, owning text, view conversions, mutation restrictions, and borrow lifetimes."
section: reference
lesson: 14
source: docs/language/text.md
---

## Characters and UTF-8 views

`char` is an immutable, copyable Unicode scalar. It supports equality, inequality, and pattern matching, but no arithmetic, ordering, truthiness, or implicit numeric conversion. `as u32` obtains its scalar number.

`str` is an immutable UTF-8 view passed by value and represented by an address and byte length. Length includes interior NUL; trailing NUL is not guaranteed. It does not own storage. There is no &`str` reference type or source-level lifetime annotation. Backing may come from static literals, a `String` borrow, or external storage. Copying preserves known relationships.

## String literals and multiline layout

| Kind         | Single-line | Multiline    | Escapes | Interpolation |
| ------------ | ----------- | ------------ | ------- | ------------- |
| Ordinary     | `"..."`     | `"""..."""`  | Yes     | No            |
| Raw          | `r"..."`    | `r"""..."""` | No      | No            |
| Interpolated | `f"..."`    | `f"""..."""` | Yes     | Yes           |

Ordinary and raw literals produce str with program-lifetime storage. Multiline interpolation produces String under the same evaluation and ownership rules as single-line interpolation. Prefixes must touch the delimiter; r and f remain identifiers elsewhere. Raw/interpolated prefixes cannot combine. C strings remain single-line, escaped, and NUL-free.

Raw strings preserve backslashes and braces. Zero or more hashes may extend their delimiters, as in `r#"text"#` or `r#"""..."""#`. The first complete closing sequence with the opening quote count and hash count ends the literal; extra hashes are outside it.

```carven
let path = r"C:\tools\bin\";
let json = r#"{"name": "{name}"}"#;
let text = """
    Hello
      Carven
    World
""";
println(text); // Hello, two spaces before Carven, then World on separate lines
```

The multiline example has exactly the value `"Hello\n  Carven\nWorld"`. A multiline opening delimiter must be immediately followed by LF or CRLF. Its closing delimiter occupies a separate line, preceded only by spaces or tabs; ordinary code such as a semicolon, comma or closing parenthesis may follow it. Closing indentation does not determine the value.

Layout follows these rules:

1. Remove the opening line ending, closing-line indentation, and the line ending immediately before the closing line when distinct from the opening line ending. Additional blank body lines remain.
2. Find the longest common space/tab prefix of nonblank body lines, matching characters rather than display columns. Blank lines do not determine it.
3. Remove that prefix from nonblank lines. From blank lines remove only the leading characters that match it, stopping at a mismatch or either end. Preserve remaining and trailing whitespace. A nonblank unindented line makes the prefix empty.
4. If all body lines are blank, remove their spaces/tabs but retain separating line endings. Zero or one blank body line yields empty text; two yield one LF.
5. Normalize physical LF/CRLF to LF; standalone CR in text is invalid. Then decode escapes and interpolation. Whitespace they produce is content and is never removed as indentation.

Each interpolation hole counts as one nonblank content unit. Its code, nested strings, comments, specifications, and physical newlines do not affect surrounding layout. Text following it continues the same logical body line until a text line ending. Inserted values retain their own whitespace without added or removed indentation. The same layout applies to ordinary, raw, and interpolated forms. Escaped tabs or spaces can express content indentation; backslash continuation and adjacent-literal concatenation are unsupported.

## Unchecked text construction

`char::from_u32_unchecked(value: u32) -> char` constructs a character from a valid Unicode scalar: at most U+10FFFF, excluding U+D800..U+DFFF. `str::from_utf8_unchecked(bytes: [u8]) -> str` constructs a borrowed view of valid UTF-8 without copying, allocating, or extending the backing lifetime. Both are called directly through type names without imports.

Native execution does not validate content; callers must satisfy the preconditions. Use checked [UTF library](/reference/utf/) functions for unvalidated input. Character construction also supports constant execution and interpretation, which check the scalar precondition and diagnose invalid values; this is not a typed failure. Unchecked borrowed text construction currently supports neither constant execution nor interpretation. Ordinary borrowing and argument-type checks still apply.

## Text queries

Both `str` and `String` provide:

| Expression        | Meaning                                     |
| ----------------- | ------------------------------------------- |
| `text.len()`      | UTF-8 byte count as `usize`                 |
| `text.is_empty()` | Whether the byte count is zero              |
| `text.bytes`      | Read-only `[u8]`                            |
| `text.chars`      | Read iteration range decoding `char` values |

bytes/chars are computed projections on specific types, not a general property mechanism. The chars view type cannot be spelled explicitly; it supports inferred bindings and Read range iteration. Byte views expose the full slice API. Use `0..text.len()` for byte positions: the literal bound takes the other bound's type, so the range is `range<usize>`. User structs may have fields with these names.

## `String` ownership

`String` requires no import. Unprefixed `String` in type and factory-qualifier positions prefers the builtin type. Ordinary value lookup is unchanged; `::String` selects a C++ name.

`String` owns contiguous valid UTF-8 bytes, including possible NUL. It performs no normalization, case folding, or BOM removal. Equality compares bytes. Capacity, layout, address stability, trailing NUL, and allocation count have no source-level guarantees.

| Operation                 | Access and result                               |
| ------------------------- | ----------------------------------------------- |
| `String {}`               | Empty `String`                                  |
| `String::from_str(text)`  | Read `str`; independent copy                    |
| `s.len()`, `s.is_empty()` | Read, O(1)                                      |
| `s.as_str()`              | Read, O(1) borrow; no allocation or transcoding |
| `s.append(text)`          | Write receiver, Read `str`, void                |
| `s.append_format(f"...")` | Write receiver, formatted append, void          |
| `s.push(character)`       | Write, encode one `char`, void                  |
| `s.clear()`               | Write, void                                     |

Mutable fields and elements may be Write receivers; temporaries and Read parameters may not. Dot calls supply receiver access, while ordinary arguments still obey explicit access markers. Factories and methods must be called directly, with parentheses around a direct call allowed. They cannot be taken as first-class method values.

## Conversions, copying, and borrowing

A literal defaults to `str`; in `String` context it constructs an owning value. An existing `str` needs `as String` or from_str to copy. `String` borrows in `str` destination context, equivalent to `.as_str()`. Write parameters still require matching slot types.

```carven
var owner: String = "hello";
let copy = owner;          // Independent String
let view = owner.as_str(); // Borrowed str
```

A `String` copy owns independent contents. Take makes the whole source owner unavailable. Read `String` parameters refer to caller storage. Equality between existing `str` and `String` values does not implicitly unify their types. A string literal on the right may accept `String` context from the left.

`String` has no literal patterns, direct indexing, ordering, truthiness, `+` concatenation, direct iteration, or C++ container member access. `String(...)`, nonempty `String { ... }`, and `String as str` are invalid.

## Borrows and mutation

A named view's borrow lasts until replacement, Take, or scope exit; last use does not end it early. While borrowed, a source `String` cannot be mutated, replaced, or Taken, and neither can an owner containing it be Taken. Fields and elements may be distinguished; an unknown index may overlap any element.

Write is nonexclusive: Write aliases or captures can be established, but actual writes remain subject to existing borrows. A native Write call counts as a possible write. Even clear or append that leaves contents unchanged requires write permission. `s.append(s.as_str())` is invalid; establish an independent copy first.

```carven
var text: String = "hello";
text = text.as_str() as String;
let snapshot = text;
text.append(snapshot);
```

The right-side copy completes before writing the assignment target. A temporary view protects backing until its consuming operation completes, including later argument evaluation. A temporary borrow may end once an independent result no longer carries input borrows. An independent `String` copy may therefore combine with a later Take, whereas a direct view may not.

Returning a view of a Read `String` parameter requires sufficiently long-lived caller backing. Views of a local `String` or Take parameter cannot escape. Storing `String::from_str("x").as_str()` as a named view is invalid, but immediate consumption can be valid. A range loop retains a `String` owner produced by its header and cleans it up on every loop exit.

An aggregate may contain both `String` and `str` fields, but cannot retain a view into its own `String` storage. Copying its `String` field creates independent contents; copying its view field retains the original referent.

## Failure payloads and text validity

Failure structs and enums may contain `String`. throw copies by default; explicit Take transfers. The original failure payload retains borrows independently of copied catch bindings through selection, guards, and rethrow. Cleanup must not destroy backing early. A handler may copy text into an independent `String`.

`char::from_u32_unchecked(u32)` requires a valid Unicode scalar. `str::from_utf8_unchecked([u8])` requires valid UTF-8 and borrows its input. Both are direct builtin factories; native execution performs no content validation. Carven checks types and known borrows; the caller guarantees the preconditions. Static execution and interpretation check the character scalar precondition when executed and report an execution error for invalid values. Unchecked borrowed text construction is unavailable in either executor. Use the checked UTF library for unvalidated input.

`String` allocation failure and unrepresentable length terminate.

## Text in compile-time execution

Required compile-time execution supports `String` construction and mutation, as_str, len/is_empty, interpolation, byte views and slice operations, and byte loops. Character iteration through `text.chars` and unchecked borrowed text construction remain outside the executor and report `CV-CONST-ADMISSION`. Unchecked scalar construction is admitted and checks its precondition during execution.

```carven
const fn count_spaces(text: str) -> usize {
    var count = 0usize;
    for byte in text.bytes {
        if byte == 0x20 {
            count += 1;
        }
    }
    return count;
}

const spaces = count_spaces("a b c");
for index in 0..spaces {
    println(index);
}
```

This prints `0` and `1`. The range `0..spaces` is `range<usize>` because the unsuffixed literal takes the type of the other bound. Byte addresses are checked for liveness during compile-time execution; see [pointers](/reference/pointers/#liveness-checks).

C string literals `c"..."` are native `const char*` values, not `str`. They can initialize constants, pass through functions, and be copied, assigned, and Taken during compile-time execution; freezing keeps their bytes and pointer type. Constant execution and interpretation read their retained bytes for printing and default text formatting. Pointer comparison, address observation, and C string literal patterns are not supported; see [C strings](/reference/interop/#c-strings).
