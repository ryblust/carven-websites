---
title: "Formatting and output"
description: "Hole evaluation and observation, append restrictions, compile-time formatting, and stdout/stderr."
section: reference
lesson: 15
source: docs/language/text.md
---

## Interpolation expressions

Use `f"..."` to insert expression values into text. The result is an independent owning `String`, even when empty or without holes. Add a `:` format specification to control alignment, width, precision, or representation under the corresponding `std::format` rules.

```carven run
fn main() {
    let id = 42;
    println(f"ID: {id:08x}");
    println(f"{{value}} = {id}");
}
```

Dynamic width and precision use nested holes, for example `f"{value:{width}.{precision}f}"`. For runtime formats outside the builtin optimized subset, C++ checks format validity and formatter availability. Aggregates, enums, and callables have no Carven custom-formatting protocol; they use their native representation and corresponding formatter.

## Evaluation and observation

All holes, including dynamic format parameters, evaluate once in source order before formatting begins. Holes have Read access and cannot directly use argument markers `&` or `&&`; nested calls still obey their own parameter contracts.

Scalar Read saves the value at that point. `String` Read retains an owner alias and reads contents after all holes complete. Text views protect backing during evaluation and formatting. The result owns independent contents.

A failed hole skips later holes and formatting, retains completed side effects, and cleans up temporaries. Discarding the interpolation result still performs formatting. `char` first encodes as UTF-8 and uses string width and precision rules.

## Formatted append

`destination.append_format(f"...")` returns `void` and requires a direct interpolation expression, allowing parentheses. An ordinary string, a previously constructed `String`, or an access-marked argument does not satisfy this form. No intermediate source-level interpolation `String` is created.

The receiver is selected once, then every hole is evaluated, then appending begins. Formatting inputs must not borrow or alias the target `String`, including `String` Read aliases. Existing views also prevent writing. `s.append_format(f"{s.byte_length()}")` may be valid because it uses an independent scalar snapshot. Native formatters and callers must preserve this condition under indirect aliasing and reentrancy.

A receiver or hole failure skips append and subsequent evaluation. Termination after formatting begins has no rollback guarantee. Invalid UTF-8 output, allocation failure, and runtime format errors terminate without introducing typed failures. A normally completed result preserves interior NUL and is valid UTF-8.

## Using known format information

The compiler may prepare known parts of a format during compilation and format the remaining values at runtime. The result retains its `String` type. Each hole still evaluates in source order, with its required effects and temporary lifetimes.

Optional preparation has a 64 KiB work budget. Unsupported or larger parts continue through runtime formatting; this is different from a required const initializer, which must finish during compilation. The budget does not limit the final runtime String length.

Supported formats may let the compiler prove UTF-8 validity in advance. Other outputs are checked at runtime. Either path follows the same format and error rules. Custom native formatters still receive the original arguments, and their providers must respect the arguments' access and lifetime contracts.

## Required constant formatting

Constant initialization and `const fn` execution support default integer, `bool`, `char`, unit, and text formatting (including known C string contents), plus integer `b/B/o/d/x/X`, decimal width, and zero padding. `f32`/`f64` support default formatting and `a/A/e/E/f/F/g/G`, including fill, alignment, sign, alternate form, zero padding, width, and precision; locale-dependent `L` is excluded. Dynamic width and precision evaluate first and must be nonnegative integers. Conversion uses the native standard library within compile-time resource budgets.

```carven
const amount = f"{12.5:.2f}"; // 12.50
const title = f"build-{42:04}"; // String containing build-0042
const bytes = f"{'我'}".byte_length();  // usize with value 3
```

Each constant interpolation result is limited to 1 MiB, with additional cumulative work and format-nesting budgets. Runtime interpolation remains an owning `String`; completed constant initialization preserves its owning `String` type. Interpolation cannot replace an ordinary string literal or literal pattern required by syntax.

## Printing

`print`, `println`, `eprint`, and `eprintln` accept one or more Read values and return `void`. Unit values and character-iteration views are not printable. `println()` and `eprintln()` also allow zero arguments. Their [module bindings](/reference/modules/#standard-modules-and-defaults) follow ordinary lookup.

| Operation  | Stream   | Ending           |
| ---------- | -------- | ---------------- |
| `print`    | `stdout` | No added newline |
| `println`  | `stdout` | One newline      |
| `eprint`   | `stderr` | No added newline |
| `eprintln` | `stderr` | One newline      |

Arguments are evaluated once left to right and separated by one space. Scalars save values, `String` retains aliases, and views protect backing. Text is emitted literally, including NUL; `char` emits UTF-8. `println("{value}", 3)` prints `{value} 3`: the text itself is not a format string.

Printing needs no `?`. Buffering and flushing follow the C++ standard library, with no promise to flush every call. Native formatting or output failures terminate. An expected signature may select a printing callable, for example `let output: fn(str, i32) -> void = println;`.

`const fn`, constant blocks, and `const test` can call the printing built-ins directly within their supported type subset, including C strings as text. Only required constant execution writes through the compiler host; ordinary calls write at runtime. Completed output remains after later failure. Output bytes count toward cumulative text work.

## Structural display

Direct `println(value)` displays logical data structure: structs show source type names and fields in declaration order, enums show `Type::Case` and payloads, arrays and slices show bracketed elements, and integer ranges show bounds with `..` or `..=`. Nonempty structs, sequences, and enum payloads expand across lines, with four spaces per level, a trailing comma per item, and a closing delimiter on its own line. Empty structs and sequences remain `Type {}` and `[]`. Layout does not depend on line width.

Nested text and characters are quoted and escaped; top-level text stays verbatim. Class values show only their type name, also when nested, and never expand their private fields.

Native results are classified by their C++ type:

| C++ type                                           | Display                                                                             |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Arithmetic types                                   | Scalar value                                                                        |
| `char32_t`                                         | Character, quoted when nested                                                       |
| `char8_t`, `char16_t`, `wchar_t`                   | Numeric code unit                                                                   |
| `std::string_view`, runtime `String`               | Quoted text                                                                         |
| `char*`, `const char*`                             | Text rules; null shows `nullptr`, non-null requires readable NUL-terminated storage |
| Other pointers convertible to `const void*`        | Address or `nullptr`, without dereferencing                                         |
| Other external types, function pointers, callables | `<opaque>`                                                                          |

```carven run
class Token {
    id: i32,
    fn create(id: i32) -> Token => { id: id };
}

struct Entry {
    token: Token,
    name: str,
}

println(Entry { token: Token::create(7), name: "seven" }, [c"7"]);
```

```text
Entry {
    token: Token,
    name: "seven",
} [
    "7",
]
```

Display never calls custom formatters, stream insertion operators, or getters, including for nested fields. `println(f"{value}")` first performs explicit formatting instead. Read and backing requirements cover the complete value; printing adds no owning copy or transfer.

The root has depth zero. Display expands at most eight levels, shows at most 64 elements per array or slice, and retains at most 16,384 UTF-8 bytes including layout whitespace, marking omissions with `...`. These limits also apply to structural values in assertion explanations, but not top-level verbatim text. Display is diagnostic text, not serialization. Constant blocks, `const fn`, and `const test` use the same display rules within their execution subsets.

Erased pointers accept an empty format or `p`; static execution produces `const@nonnull` / `const@null`, while interpreted and native address display use their own execution context. Tuples and Vectors participate in structural display under the same depth, item, and byte limits.
