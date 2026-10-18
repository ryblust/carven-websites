---
title: "Characters and text"
description: "UTF-8, owning text, view conversions, mutation restrictions, and borrow lifetimes."
section: reference
lesson: 14
source: docs/language/text.md
---

## Characters and UTF-8 views

Choose `String` when the value should own its text and `str` when it should read existing text without copying. Both use UTF-8. A `char` holds one Unicode scalar: one code point other than a surrogate, rather than necessarily one whole displayed symbol. It is immutable and copyable. It supports equality,
inequality, and matching, but not numeric arithmetic, ordering, truthiness, or
implicit numeric conversion. The explicit conversion `character as u32` yields
its Unicode scalar number. `char::from_u32` performs checked integer-to-char
conversion.

`str` is an immutable, copyable, value-passed UTF-8 view represented by a pointer
and byte length. Length defines its contents, including internal NUL bytes; the view
does not promise a trailing NUL. It has no owning storage, `&str` type, or source
lifetime syntax. Its backing can be static literal storage, a checked borrow of a `String`,
or externally supplied storage. Copying a view preserves its known backing relationship.

Decoded string and character literal values are not Unicode-normalized.

Both `str` and `String` provide:

- `text.byte_length() -> usize` returns the UTF-8 byte count.
- `text.is_empty() -> bool` tests that byte count.
- `text.bytes` returns the read-only slice `[u8]`.
- `text.chars` is a copyable read-only range that decodes `char` values.

`bytes` and `chars` are computed projections, not general properties.
The `chars` view type cannot be spelled; bindings and aggregate components infer
it. Each Read traversal starts at the beginning of the selected text; copies
keep the same view and have independent traversal cursors. Byte views support
all slice operations.
User structures may declare same-named fields because member resolution depends
on the receiver type.

## String literals and multiline layout

| Kind         | Single-line | Multiline    | Escapes | Interpolation |
| ------------ | ----------- | ------------ | ------- | ------------- |
| Ordinary     | `"..."`     | `"""..."""`  | Yes     | No            |
| Raw          | `r"..."`    | `r"""..."""` | No      | No            |
| Interpolated | `f"..."`    | `f"""..."""` | Yes     | Yes           |

Ordinary and raw literals produce `str` with program-lifetime storage. Multiline
interpolation follows the same type, ownership, and evaluation rules as
single-line interpolation. All text must be valid UTF-8; no Unicode normalization
is performed. `c"..."` is single-line and NUL-free, with ordinary escapes.
Prefixes are adjacent to their delimiters. `r` and `f` are ordinary identifiers
elsewhere. Prefix combinations such as `fr`, `rf`, and
`cr` are not string forms.

Raw strings preserve backslashes and braces literally. Matching `#` characters
extend their delimiters to distinguish the closing boundary from body text:

```carven run
let path = r"C:\tools\bin\";
let json = r#"{"name": "{name}"}"#;
let example = r#"""
    A literal """ sequence.
    Backslashes such as \n remain text.
"""#;

println(path);
println(json);
println(example);
```

The first complete closing sequence ends the literal: one or three quotes,
followed by the number of `#` characters in the opening delimiter. Extra `#`
characters after that sequence are outside the literal.

Single-line text cannot contain physical line endings. Multiline opening
markers must be immediately followed by LF or CRLF. A closing marker must be
on a separate line, preceded only by spaces or tabs; normal code such as `;`,
`,`, or `)` may follow it. The closing line's indentation does not determine
the string value.

```carven run
let text = """
    Hello
      Carven
    World
""";
println(text);
// Equivalent to "Hello\n  Carven\nWorld".
```

Multiline layout uses these rules:

1. Exclude the opening line ending and the closing line's indentation. Exclude
   the line ending immediately preceding the closing line, if distinct from
   the opening line ending. Additional blank body lines remain content.
2. Find the longest common space/tab prefix of nonblank body lines. Match
   characters, not display columns. Blank lines do not determine this prefix.
3. Remove that prefix from nonblank lines. On blank lines, remove only the
   leading characters matching the prefix, stopping at its end, the line's end,
   or the first mismatch. Preserve remaining spaces, tabs, and trailing spaces.
   A nonblank line with no indentation makes the common prefix empty.
4. If every body line is blank, remove all spaces and tabs on those lines while
   retaining their separating line endings. Zero or one blank body line gives
   an empty string; two blank body lines give one LF.
5. Normalize physical LF and CRLF to LF. A standalone CR in literal text is
   invalid. Then interpret escapes and interpolation; their produced whitespace
   is never treated as source indentation.

In multiline interpolation, each hole counts as one nonblank content unit.
The hole's code, including nested strings, comments, format specifications, and
physical line endings, does not participate in the surrounding text's layout.
Text after the hole continues the same logical body line until a text line
ending. Format text uses ordinary escapes and ends at a brace; decoded escapes
are not rescanned for interpolation delimiters. Hole expressions admit physical
line endings under ordinary expression rules. Inserted values retain their own
whitespace; no indentation is removed or added.

Multiline layout applies equally to ordinary, raw, and interpolated strings.
Escapes such as `\t` and `\u{20}` express content indentation independently of
source indentation in ordinary and interpolated strings. Backslash line
continuation and implicit adjacent-literal concatenation are not supported.

## Checked text construction

Use `char::from_u32` for checked scalar conversion and `str::from_utf8` for a checked borrowed text view. These associated entries call the source functions documented under [UTF encoding, decoding, and validation](/reference/utf/#encoding-decoding-and-validation), including their signatures, imports, error payloads, and execution support. Copy a returned `str` with `as String` when independent ownership is needed.

## Unchecked text construction

`char::from_u32_unchecked(value: u32) -> char` requires a Unicode scalar value:
at most U+10FFFF, excluding U+D800 through U+DFFF.
`str::from_utf8_unchecked(bytes: [u8]) -> str` requires valid UTF-8 and borrows
the input storage without copying or allocating. Both are builtin factories
called directly through their type names; no runtime header import is needed.

These operations do not validate content. The caller must satisfy their content
preconditions; violating them is outside the language's valid text contract.
Carven checks argument types and tracks the returned text's backing through
ordinary borrow analysis. Construction does not extend the backing lifetime.
Use the checked constructors for input that has not been validated.

Both constructors are available in constant initializers, `const fn`, and
interpretation. The executor checks their content preconditions when they execute
and diagnoses invalid input as an execution error, not a typed failure. Borrowed
text retains the selected byte range and its backing lifetime; its `.bytes` view
refers to that same range. Native construction retains the caller-provided
precondition without adding validation.

## `String` ownership

`String` is a builtin owning UTF-8 value, available without imports and distinct
from `str`, user declarations, and C++ types. Its default binding belongs to
`std::core` and follows ordinary name selection. Module declarations can shadow
the type name; runtime locals also shadow factory qualifiers. Use an explicit
alias such as `import std::core using String as Text;` to retain access.
`::String` selects an external C++ name.

A String owns contiguous, valid UTF-8 bytes, including internal NUL. It performs
no normalization, case folding, or BOM removal. Equality and inequality compare
bytes, including between `String` and `str` operands through borrowed views.
Length counts bytes. Storage layout, capacity, address stability, trailing NUL,
and allocation count are unspecified.

| Operation                          | Access and result                                |
| ---------------------------------- | ------------------------------------------------ |
| `String {}`                        | Empty owning `String`                            |
| `String::from_str(text: str)`      | Read text; independent owning copy               |
| `s.byte_length()` / `s.is_empty()` | Read receiver; `usize` / `bool`                  |
| `s.as_str()`                       | Read receiver; borrowed `str`                    |
| `s.bytes` / `s.chars`              | Read receiver; borrowed byte/scalar range        |
| `s.append(text: str)`              | Write receiver, Read text; `void`                |
| `s.append_format(f"...")`          | Write receiver, Read interpolation holes; `void` |
| `s.push(value: char)`              | Write receiver, Read scalar; `void`              |
| `s.clear()`                        | Write receiver; `void`                           |

The queries `byte_length`, `is_empty`, and `as_str` are O(1); `as_str` does not allocate
or transcode. `push` encodes one Unicode scalar into UTF-8. Mutable fields and
array elements can be Write receivers; temporaries and Read parameters cannot.
The dot receiver supplies its access, while ordinary arguments follow the usual
explicit-marker rules. Factories and methods require direct calls, including
grouped direct calls; they do not produce first-class method values.

String literals default to `str`. In a `String` context, a literal constructs an
owning value; this applies to annotated bindings, assignments, arguments, returns,
and aggregate initializers. Grouping preserves that context. An existing `str`
value requires `text as String` or `String::from_str(text)` to create an independent
owning copy.

A `String` value in a `str` destination context creates a borrowed view with the
same lifetime and ownership constraints as `.as_str()`. Write arguments still
require matching storage types. Without a `str` context, `let copy = owner`
retains String value semantics; `let view = owner.as_str()` explicitly creates a
view. Borrowing neither allocates nor extends the owner's lifetime.

```carven run
var owner: String = "hello";
let copy = owner;          // Independent String
let view = owner.as_str(); // Borrowed str
println(copy, view); // hello hello
```

String literal patterns, indexing, ordering, truthiness, concatenation,
direct iteration, and access to C++ container members are unsupported.
Nonempty `String { ... }`, `String(...)`, and `String as str` are invalid.
Iterate `s.bytes` or `s.chars`.

Copying String creates independently owned content. Whole-owner Take transfers
the value and makes its source unavailable. Read String parameters alias the
caller's storage. Fields, elements, captures, results, and cleanup use ordinary
Carven value rules. Borrowing does not extend a String owner's lifetime.

## Borrows and mutation

A borrowed view keeps referring to its original storage when copied or passed
through aggregates, captures, functions, Write outputs, branches, loops, and
failure payloads. Owning copies made by `as String` or `from_str` and extracted `u8`/`char`
values are independent of the source. A named value holding a view keeps the
borrow until that value is replaced, taken, or leaves scope; its last use does
not end the borrow.

While a view borrows a String, that String cannot be modified, replaced, or
taken, including by taking a containing owner. The check distinguishes fields
and elements; an unknown index may overlap any possible element. Write access
is nonexclusive: creating a Write alias or capture is allowed, but actual
writes through it must respect live borrows. Native Write access counts as a
possible write. This also applies to `append` and `clear` when contents would
not change. Self-append `s.append(s.as_str())` is rejected; copy to an independent
owner first.

Temporary views keep their backing borrowed until the consuming operation
finishes, including evaluation of its remaining operands. An independent result
ends that borrow when no other view remains. For example:

```carven run
var text: String = "hello";
text = text.as_str() as String;
let snapshot = text;
text.append(snapshot);
println(text); // hellohello
```

The RHS copy finishes before assignment writes. Similarly,
`f(String::from_str(s.as_str()), &&s)` can be valid, while
`f(s.as_str(), &&s)` is rejected. Each receiver/operand is evaluated once in
source order, with the receiver or assignment target selected first. A selected
Read receiver observes its content when the operation executes.

A view may be returned from a Read String parameter when the caller backing
outlives the returned view. Views into callee-local Strings or Take parameters
cannot escape. Saving `String::from_str("x").as_str()` into a named view is
invalid; immediate consumption is valid. A range loop retains String owners
created while evaluating its header, including those passed through view-returning
functions; `for c in String::from_str("x").chars` is valid. The borrow lasts
through the loop; retained temporaries are destroyed on every loop exit.

An aggregate can contain both String and str fields, but cannot store a view
into its own String storage. Copying a String field creates independent content;
copying a view field keeps referring to its original storage.
A view may borrow an owning String stored in a live closure.

Nominal failure values can contain Strings under the ordinary copyable failure
contract; builtin String itself is not a failure type. Throw copies unless Take
is explicit. Borrowed text must remain valid through throw, propagation, catch
selection and guards, and rethrow. The original failure payload retains its
borrows independently of copied catch bindings. Unwinding must not destroy
their backing. A handler can copy borrowed content into an independent String result.
Completed effects are retained on failure; mutation is not rolled back.

Builtin String construction accepts valid text and scalars. Allocation failure
and unrepresentable lengths terminate.

## Static execution

String construction, mutation, queries, byte and character traversal, and checked and unchecked text construction support static execution. Completed `String` constants retain their owning type, including nested fields and elements. An explicit `str` destination or character view retains immutable program-lifetime backing.

[Compile-time computation](/reference/constants/) defines execution checks and budgets. C string execution, pointer comparison, and formatting are described under [C strings](/reference/interop/#c-strings).

## String interpolation

Use `f"..."` to construct an independent owning `String` from text and expressions. Use `append_format` to append a direct interpolation to an existing writable String:

```carven run
let name = "Ada";
var message = f"Hello, {name}!";
message.append_format(f" Count: {3:02}");
println(message); // Hello, Ada! Count: 03
```

See [interpolation, formatting, and output](/reference/formatting/) for format specifications, evaluation, append restrictions, compile-time formatting, and errors.
