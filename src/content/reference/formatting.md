---
title: "Interpolation, formatting, and output"
description: "Hole evaluation and observation, append restrictions, compile-time formatting, and stdout/stderr."
section: reference
lesson: 12
source: docs/semantics.md
---

## Interpolation expressions

`f"..."` returns an independent owning String, even when empty or without holes. Holes may include `:` format specifications following the corresponding std::format alignment, width, precision, and type rules.

```carven
fn main() {
    let id = 42;
    println(f"ID: {id:08x}");
    println(f"{{value}} = {id}");
}
```

Dynamic width and precision use nested holes, for example `f"{value:{width}.{precision}f}"`. For runtime formats outside the builtin optimized subset, C++ checks format validity and formatter availability. Aggregates, enums, and callables have no Carven custom-formatting protocol; they use their native representation and corresponding formatter.

## Evaluation and observation

All holes, including dynamic format parameters, evaluate once in source order before formatting begins. Holes have Read access and cannot directly use argument markers & or &&; nested calls still obey their own parameter contracts.

Scalar Read saves the value at that point. String Read retains an owner alias and reads contents after all holes complete. Text views protect backing during evaluation and formatting. The result owns independent contents.

A failed hole skips later holes and formatting, retains completed side effects, and cleans up temporaries. Discarding the interpolation result still performs formatting. char first encodes as UTF-8 and uses string width and precision rules.

## Formatted append

`destination.append_format(f"...")` returns void and requires a direct interpolation expression, allowing parentheses. An ordinary string, a previously constructed String, or an access-marked argument does not satisfy this form. No intermediate source-level interpolation String is created.

The receiver is selected once, then every hole is evaluated, then appending begins. Formatting inputs must not borrow or alias the target String, including String Read aliases. Existing views also prevent writing. `s.append_format(f"{s.len()}")` may be valid because it uses an independent scalar snapshot. Native formatters and callers must preserve this condition under indirect aliasing and reentrancy.

A receiver or hole failure skips append and subsequent evaluation. Termination after formatting begins has no rollback guarantee. Invalid UTF-8 output, allocation failure, and runtime format errors terminate without introducing typed failures. A normally completed result preserves interior NUL and is valid UTF-8.

## Using known format information

Ordinary runtime interpolation can use compile-time knowledge too. The compiler may precompute supported builtin format fragments or write mixed builtin fields directly into String storage. Static integer specifications, common floating specifications, and default str, String, bool, and char fields can share this path, for both interpolation and append_format. Not every hole value needs to be constant.

These transformations preserve each hole's required evaluation and side effects. Even if `update() && false` has a known final value, update still runs. A runtime result remains an independent owning String; this does not allow returning a str borrowed from static text.

When operand types and supported static formats prove the output is valid UTF-8, the compiler may omit final validation. Other output remains runtime-validated. These choices do not change format rules, evaluation order, or error boundaries.

Dynamic text lengths are read after all holes finish, preserving String alias observations. Capacity bounds combine prepared field sizes with those lengths using checked arithmetic. A direct writer path needs no native format parser or final UTF-8 scan; unsupported remaining fields use the general formatter. These are implementation choices, not a promise that every interpolation avoids allocations.

The current implementation gives optional text precomputation a 64 KiB budget. Delegated residual formats additionally budget escaped braces and retained field spellings; direct writer selection does not serialize a native format string. Excess or unsupported parts continue through runtime formatting rather than rejecting the program. This differs from required constant execution, where a const initializer cannot fall back to runtime. The budget limits precomputation work, not final runtime string length.

A native custom formatter may inspect the entire argument set, so original arguments are retained. A known result does not remove required owner construction, temporary lifetimes, or cleanup.

## Required constant formatting

Constant initialization and const fn execution support default integer, bool, char, and text formatting, plus integer `b/B/o/d/x/X`, decimal width, and zero padding. f32/f64 support default formatting and `a/A/e/E/f/F/g/G`, including fill, alignment, sign, alternate form, zero padding, width, and precision; locale-dependent `L` is excluded. Dynamic width and precision evaluate first and must be nonnegative integers. Conversion uses the native standard library within compile-time resource budgets.

```carven
const amount = f"{12.5:.2f}"; // 12.50
const title = f"build-{42:04}"; // str containing build-0042
const bytes = f"{'我'}".len();  // usize with value 3
```

Each constant interpolation result is limited to 1 MiB, with additional cumulative work and format-nesting budgets. Runtime interpolation remains an owning String; completed constant initialization freezes it to str. Interpolation cannot replace an ordinary string literal or literal pattern required by syntax.

## Printing

print/println/eprint/eprintln need no import and follow ordinary lookup and shadowing. They accept one or more Read builtin scalars or str/String and return void. println() and eprintln() also allow zero arguments.

| Operation | Stream | Ending           |
| --------- | ------ | ---------------- |
| print     | stdout | No added newline |
| println   | stdout | One newline      |
| eprint    | stderr | No added newline |
| eprintln  | stderr | One newline      |

Arguments are evaluated once left to right and separated by one space. Scalars save values, String retains aliases, and views protect backing. Text is emitted literally, including NUL; char emits UTF-8. `println("{value}", 3)` prints `{value} 3`: the text itself is not a format string.

Printing needs no ?. Buffering and flushing follow the C++ standard library, with no promise to flush every call. Native formatting or output failures terminate. An expected signature may select a printing callable, for example `let output: fn(str, i32) -> void = println;`.

const fn and const test can print directly within their supported type subset. Only required constant execution writes through the compiler host; ordinary runtime calls still print at runtime. Completed output remains after later failure. Output bytes count toward cumulative text work.
