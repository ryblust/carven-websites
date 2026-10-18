---
title: "Slices and static storage"
description: "Construction, borrowing, subranges, returns, and freezing read-only slices."
section: reference
lesson: 11
source: docs/language/types.md
---

## Meaning of `[T]`

A slice is a copyable, non-owning, read-only view of contiguous elements. It retains a relationship to backing storage without copying elements. Element representation is unchanged: `[A]` does not convert element by element into `[B]`.

`first` in this example requires at least one element.

```carven run
fn first(values: [i32]) -> i32 => values[0];

fn main() {
    let values = [2, 4, 6];
    let view = values.slice();
    println(first(values), view.length());
}
```

`array.slice()` and `vector.slice()` explicitly create views. Both owners also accept `slice(start, end)` to select a subrange directly. When `[T]` is expected, `[T; N]` and `Vector<T>` may implicitly create the same view in initialization, assignment, arguments, returns, and aggregate element positions. Array literals use the expected slice element type, including `[]`. An empty slice formed from a zero-length array retains no backing storage. Without slice context, an array remains an array. A Write argument needs an actual slice slot.

## Slice operations

| Operation             | Result                                  |
| --------------------- | --------------------------------------- |
| `s.length()`          | Element count as `usize`                |
| `s.is_empty()`        | `bool`                                  |
| `s[index]`            | Read element access; integer index      |
| `s.slice()`           | Copy of the same view and range         |
| `s.slice(start, end)` | Half-open range; both arguments `usize` |
| `for item in s`       | Read iteration                          |

Empty ranges such as `slice(length, length)` are valid. Invalid dynamic indices or ranges terminate. Slices have no element writes, Write iteration, pointer extraction, or equality. Reading an element still applies that element type's Read/value rules.

## Borrow duration

A slice with known Carven backing protects the entire source array or Vector from mutation, replacement, Take, and destruction. Protection is not subdivided into disjoint subranges. Slice copies, parameters, returns, fields, closures, and failure payloads preserve the backing relationship. Extracting an element that itself contains a view retains its internal borrow.

Storing a slice does not extend the source array's lifetime. A runtime slice into a function-local array cannot be returned. Temporary backing follows full-expression and retained-loop-source rules. Last read does not automatically end a named view's borrow.

## Frozen constant slices

A constant initializer can retain a completed array or Vector as a slice:

```carven
const table: [i32] = [2, 4, 6];
const middle = table.slice(1, 3);
const count = middle.length();

fn table_view() -> [i32] => table;
```

This element storage has static lifetime and may be copied, stored, and returned. The constant declaration does not gain source-level address identity. Native code cannot depend on uses or artifacts sharing the same address.

Element preservation and supported result types follow the [freezing rules](/reference/constants/#constant-results-and-storage). Retaining arrays and constructing constant subslices count toward the shared [execution budgets](/reference/constants/#execution-budgets).

## Slices in compile-time execution

During required compile-time execution, slice parameters, locals, `length`, `is_empty`, indexing, subslicing, and loops run against live backing storage. Copies and chained slices keep that backing relationship without extending its lifetime; indexing and subranges are bounds-checked when executed and report `CV-CONST-INDEX-BOUNDS` on failure. A completed constant root freezes the selected elements before releasing its backing, so a `const fn` may return a view of a frozen constant slice:

```carven run
const fn total(values: [i32]) -> i32 {
    var sum = 0;
    for value in values {
        sum += value;
    }
    return sum;
}

const fn tail(values: [i32]) -> [i32] => values.slice(1, values.length());

const table: [i32] = [2, 4, 6];
const rest = tail(table);
const sum = total(rest);
println(rest.length(), sum); // 2 10
```

Ordinary lifetime rules still apply: returning a slice of a `const fn` local array is rejected. A `const fn` array result may also become a frozen slice when constant initialization completes. Knowing a runtime array's contents does not grant it static backing.
