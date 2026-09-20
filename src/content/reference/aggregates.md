---
title: "Structs, arrays, and enums"
description: "Construction order, type identity, bounds checks, enum payloads, and recursive storage."
section: reference
lesson: 5
source: docs/semantics.md
---

## Structs

A struct is an ordered nominal product type with unique field names. Construct it positionally in declaration order or by field name. Nonempty construction must initialize every field exactly once; named and positional forms cannot mix. Empty `T {}` requests whole-value default initialization. Struct bodies contain fields, not member function definitions.

```carven
struct Point {
    x: i32,
    y: i32,
}

fn origin() -> Point => Point { 0, 0 };

fn sample() -> Point => Point { y: 2, x: 1 };
```

Named construction maps to field declarations but evaluates initializers in written order. Repeated, missing, excess, unknown, or incompatible fields in nonempty construction are errors. Nonempty Carven `T { ... }` constructs structs only; empty construction also accepts builtin types with a default. Enums and callables use their own expression forms. External C++ types have separate construction rules.

A struct supports equality only when every field supports equality.

## Default initialization

`T {}` requests whole-value default initialization for types accepted by construction syntax, such as `i32 {}`, `String {}`, and a named struct. The table also describes defaults of nested fields and elements; it does not introduce array or slice construction syntax. Struct fields initialize in declaration order, recursively; a nonempty construction cannot omit fields to request partial defaults.

| Type                | Default                                     |
| ------------------- | ------------------------------------------- |
| Integers and floats | Zero; floating zero is positive             |
| bool / char         | false / U+0000                              |
| str / String        | Empty text; String owns independent storage |
| Pointers            | Null, subject to ordinary non-null checks   |
| Slices              | Empty read-only view                        |
| Integer ranges      | Empty exclusive range from zero to zero     |
| Fixed arrays        | Each element initialized independently      |
| Structs             | Every field initialized recursively         |
| External C++ types  | Native value initialization, checked by C++ |

Numeric and payload enums, callable values/views, void, and entry or iteration-only opaque types have no default. A struct or nonempty array containing them also has no default. A zero-length array needs no element default. Unsupported requests report `CV-TYPE-DEFAULT-INITIALIZATION`.

Local declarations still require an initializer; array literals still require their exact element count. Default construction does not extend borrows or relax access. Runtime, interpretation, and constant execution share defaults within each mode's supported subset; native defaults remain delegated to C++.

## Fixed arrays

The length of `[T; N]` is a nonnegative constant expression. Element type and length both contribute to type identity. Zero-length arrays retain their element type and its constraints.

```carven
let values = [1, 2, 3];
let empty: [i32; 0] = [];
const extent = 3;
let typed: [i32; extent] = [4, 5, 6];
```

Without an expected array or slice type, an array literal must be nonempty, derive its type from unambiguous elements, and have compatible elements. `[T; N]` context requires N elements. `[T]` context creates a read-only view of the produced array, subject to borrow lifetimes. Empty `[]` needs `[T; 0]` or `[T]` context.

Indexing accepts integers. Statically known negative or out-of-bounds indices are diagnosed; dynamic violations terminate. The receiver is evaluated first, then the index, once each. Element mutation requires a writable receiver. Arrays support equality only when their element type does.

## Two enum forms

An enum has at least one case. If all cases have no payload, it is numeric. Its default backing type is i32; an explicit backing type must be an integer.

```carven
enum Status: u8 {
    Ready = 1,
    Busy,
    Done,
}
```

Omitted values begin at zero or use checked increment of the preceding value. Initializers must be representable, and normalized values cannot repeat. Cases are constants and may explicitly convert to integers; integers cannot convert back to the enum.

Any payload case makes the entire enum a payload enum. It may mix in payload-free cases, but cannot declare an integer backing type, numeric initializers, or integer casts. It has no default value.

```carven
enum Reply {
    Empty,
    Number(i32),
    Pair(i32, bool),
}
```

Payload cases are first-class constructors; payload-free cases are values. A payload constructor requires exactly its parameter count. Do not append `()` to a payload-free case.

`.Case` and `.Case(...)` need an enum type from a binding, return, assignment, argument, aggregate position, or unambiguous adjacent operand. Case names are not searched globally and cannot be imported alone. A full name such as `Reply::Number(3)` specifies the owner explicitly.

Equality compares the case first. Different cases are unequal; matching cases compare payload positions with short-circuiting. A payload enum supports equality only when every payload supports it.

## Recursive storage and visibility

The by-value storage graph formed by struct fields, enum payloads, and array elements must be acyclic. Even zero-length arrays retain an element-type edge. Function parameters and results do not form storage edges. Pointers do not own their targets and can support recursive structures. Published field and payload types must be visible to the declaration's audience.
