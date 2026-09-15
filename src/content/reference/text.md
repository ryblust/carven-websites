---
title: "Characters, str, and String"
description: "UTF-8, owning text, view conversions, mutation restrictions, and borrow lifetimes."
section: reference
lesson: 6
source: docs/semantics.md
---

## Characters and UTF-8 views

char is an immutable, copyable Unicode scalar. It supports equality, inequality, and pattern matching, but no arithmetic, ordering, truthiness, or implicit numeric conversion. `as u32` obtains its scalar number.

str is an immutable UTF-8 view passed by value and represented by an address and byte length. Length includes interior NUL; trailing NUL is not guaranteed. It does not own storage. There is no &str reference type or source-level lifetime annotation. Backing may come from static literals, a String borrow, or external storage. Copying preserves known relationships.

## Text queries

Both str and String provide:

| Expression        | Meaning                                   |
| ----------------- | ----------------------------------------- |
| `text.len()`      | UTF-8 byte count as usize                 |
| `text.is_empty()` | Whether the byte count is zero            |
| `text.bytes`      | Read-only `[u8]`                          |
| `text.chars`      | Read iteration range decoding char values |

bytes/chars are computed projections on specific types, not a general property mechanism. The chars view type cannot be spelled explicitly; it supports inferred bindings and Read range iteration. Byte views expose the full slice API. User structs may have fields with these names.

## String ownership

String requires no import. Unprefixed String in type and factory-qualifier positions prefers the builtin type. Ordinary value lookup is unchanged; `::String` selects a C++ name.

String owns contiguous valid UTF-8 bytes, including possible NUL. It performs no normalization, case folding, or BOM removal. Equality compares bytes. Capacity, layout, address stability, trailing NUL, and allocation count have no source-level guarantees.

| Operation                 | Access and result                               |
| ------------------------- | ----------------------------------------------- |
| `String::new()`           | Empty String                                    |
| `String::from_str(text)`  | Read str; independent copy                      |
| `s.len()`, `s.is_empty()` | Read, O(1)                                      |
| `s.as_str()`              | Read, O(1) borrow; no allocation or transcoding |
| `s.append(text)`          | Write receiver, Read str, void                  |
| `s.append_format(f"...")` | Write receiver, formatted append, void          |
| `s.push(character)`       | Write, encode one char, void                    |
| `s.clear()`               | Write, void                                     |

Mutable fields and elements may be Write receivers; temporaries and Read parameters may not. Dot calls supply receiver access, while ordinary arguments still obey explicit access markers. Factories and methods must be called directly, with parentheses around a direct call allowed. They cannot be taken as first-class method values.

## Conversions, copying, and borrowing

A literal defaults to str; in String context it constructs an owning value. An existing str needs `as String` or from_str to copy. String borrows in str destination context, equivalent to `.as_str()`. Write parameters still require matching slot types.

```carven
var owner: String = "hello";
let copy = owner;          // Independent String
let view = owner.as_str(); // Borrowed str
```

A String copy owns independent contents. Take makes the whole source owner unavailable. Read String parameters refer to caller storage. Equality between existing str and String values does not implicitly unify their types. A string literal on the right may accept String context from the left.

String has no literal patterns, direct indexing, ordering, truthiness, `+` concatenation, direct iteration, or C++ container member access. `String(...)`, `String { ... }`, and `String as str` are invalid.

## Borrows and mutation

A named view's borrow lasts until replacement, Take, or scope exit; last use does not end it early. While borrowed, a source String cannot be mutated, replaced, or Taken, and neither can an owner containing it be Taken. Fields and elements may be distinguished; an unknown index may overlap any element.

Write is nonexclusive: Write aliases or captures can be established, but actual writes remain subject to existing borrows. A native Write call counts as a possible write. Even clear or append that leaves contents unchanged requires write permission. `s.append(s.as_str())` is invalid; establish an independent copy first.

```carven
var text: String = "hello";
text = text.as_str() as String;
let snapshot = text;
text.append(snapshot);
```

The right-side copy completes before writing the assignment target. A temporary view protects backing until its consuming operation completes, including later argument evaluation. A temporary borrow may end once an independent result no longer carries input borrows. An independent String copy may therefore combine with a later Take, whereas a direct view may not.

Returning a view of a Read String parameter requires sufficiently long-lived caller backing. Views of a local String or Take parameter cannot escape. Storing `String::from_str("x").as_str()` as a named view is invalid, but immediate consumption can be valid. A range loop retains a String owner produced by its header and cleans it up on every loop exit.

An aggregate may contain both String and str fields, but cannot retain a view into its own String storage. Copying its String field creates independent contents; copying its view field retains the original referent.

## Failure payloads and text validity

Failure structs and enums may contain String. throw copies by default; explicit Take transfers. The original failure payload retains borrows independently of copied catch bindings through selection, guards, and rethrow. Cleanup must not destroy backing early. A handler may copy text into an independent String.

`char::from_u32_unchecked(u32)` requires a valid Unicode scalar. `str::from_utf8_unchecked([u8])` requires valid UTF-8 and borrows its input. Both are direct builtin factories that do not validate contents. The compiler checks types and known borrows; the caller guarantees content preconditions. Use checked UTF library interfaces for unvalidated input.

String allocation failure and unrepresentable length terminate.
