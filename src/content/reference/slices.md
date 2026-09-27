---
title: "Slices and static backing"
description: "Construction, borrowing, subranges, returns, and freezing read-only slices."
section: reference
lesson: 11
source: docs/semantics.md
---

## Meaning of `[T]`

A slice is a copyable, non-owning, read-only view of contiguous elements. It retains a relationship to backing storage without copying elements. Element representation is unchanged: `[A]` does not convert element by element into `[B]`.

```carven
fn first(values: [i32]) -> i32 => values[0];

fn main() {
    let values = [2, 4, 6];
    let view = values.as_slice();
    println(first(values), view.len());
}
```

`array.as_slice()` explicitly creates a view. When `[T]` is expected, `[T; N]` may implicitly create the same view in initialization, assignment, arguments, returns, and aggregate element positions. Without slice context, an array remains an array. A Write argument needs an actual slice slot.

## Operations

| Operation             | Result                                |
| --------------------- | ------------------------------------- |
| `s.len()`             | Element count as usize                |
| `s.is_empty()`        | bool                                  |
| `s[index]`            | Read element access; integer index    |
| `s.slice(start, end)` | Half-open range; both arguments usize |
| `for item in s`       | Read iteration                        |

Empty ranges such as `slice(len, len)` are valid. Invalid dynamic indices or ranges terminate. Slices have no element writes, Write iteration, pointer extraction, or equality. Reading an element still applies that element type's Read/value rules.

## Borrow duration

A slice with known Carven backing protects the entire source array from mutation, replacement, Take, and destruction. Protection is not subdivided into disjoint subranges. Slice copies, parameters, returns, fields, closures, and failure payloads preserve the backing relationship. Extracting an element that itself contains a view retains its internal borrow.

Storing a slice does not extend the source array's lifetime. A runtime slice into a function-local array cannot be returned. Temporary backing follows full-expression and retained-loop-source rules. Last read does not automatically end a named view's borrow.

## Frozen constant slices

A constant initializer can retain a completed array as a slice:

```carven
const table: [i32] = [2, 4, 6];
const middle = table.slice(1, 3);
const count = middle.len();

fn table_view() -> [i32] => table;
```

This element storage has static lifetime and may be copied, stored, and returned. The constant declaration does not gain source-level address identity. Native code cannot depend on uses or artifacts sharing the same address.

Supported elements include integers, bool, char, str, and recursively eligible fixed arrays and structs. Nominal types, field types, and nested array lengths are preserved. Internal arrays do not recursively become slices, nor do String fields become str. Empty slices retain their element type. Constant indexing and subranges are checked during evaluation.

Retaining arrays and constructing constant subslices count element references toward the initializer's 524,288-element work budget. The original array remains subject to per-value size and nesting limits.

## Slices in compile-time execution

During required compile-time execution, slice parameters, locals, `len`, `is_empty`, indexing, subslicing, and loops run against live backing storage. Copies and chained slices keep that backing relationship without extending its lifetime; indexing and subranges are bounds-checked when executed and report `CV-CONST-INDEX-BOUNDS` on failure. A completed constant root freezes the selected elements before releasing its backing, so a `const fn` may return a view of a frozen constant slice:

```carven
const fn total(values: [i32]) -> i32 {
    var sum = 0;
    for value in values {
        sum += value;
    }
    return sum;
}

const fn tail(values: [i32]) -> [i32] => values.slice(1, values.len());

const table: [i32] = [2, 4, 6];
const rest = tail(table);
const sum = total(rest);
println(rest.len(), sum); // 2 10
```

Ordinary lifetime rules still apply: returning a slice of a `const fn` local array is rejected. A `const fn` array result may also become a frozen slice when constant initialization completes. Knowing a runtime array's contents does not grant it static backing.
