---
title: "Structs, classes, arrays, and enums"
description: "Construction order, value classes, contextual construction, bounds checks, enum payloads, and recursive storage."
section: reference
lesson: 10
source: docs/language/aggregates.md
---

## Structs

A struct is an ordered nominal product type with unique field names. Construct it positionally in declaration order or by field name. Nonempty construction must initialize every field exactly once; named and positional forms cannot mix. Empty `T {}` requests whole-value default initialization. Struct bodies contain fields only; operations with private fields belong to a [class](#ordinary-value-classes).

```carven
struct Point {
    x: i32,
    y: i32,
}

fn origin() -> Point => Point { 0, 0 };

fn sample() -> Point => { y: 2, x: 1 };
```

Named construction maps to field declarations but evaluates initializers in written order. Repeated, missing, excess, unknown, or incompatible fields in nonempty construction are errors. Nonempty Carven `T { ... }` constructs structs, and classes only inside their own body; empty construction also accepts builtin types with a default. The type may be omitted when context supplies it; see [contextual construction](#contextual-construction). Enums and callables use their own expression forms. External C++ types have separate construction rules.

The positional construction in `origin` keeps the type name. The declared `Point` result supplies the type for `sample`'s named construction.

Structures do not support `==` or `!=`; compare their fields explicitly. Arrays and enums support equality only when their elements or payloads support it.

## Default initialization

`T {}` requests whole-value default initialization for types accepted by construction syntax, such as `i32 {}`, `String {}`, and a named struct. The table also describes defaults of nested fields and elements; it does not introduce array or slice construction syntax. Struct fields initialize in declaration order, recursively; a nonempty construction cannot omit fields to request partial defaults.

| Type                              | Default                                        |
| --------------------------------- | ---------------------------------------------- |
| Integers and floats               | Zero; floating zero is positive                |
| SIMD byte / float vectors / masks | Zero lanes / positive-zero lanes / false lanes |
| `bool` / `char`                   | false / U+0000                                 |
| `str` / `String`                  | Empty text; `String` owns independent storage  |
| Pointers                          | Null, subject to ordinary non-null checks      |
| Slices                            | Empty read-only view                           |
| Integer ranges                    | Empty exclusive range from zero to zero        |
| Fixed arrays                      | Each element initialized independently         |
| Structs                           | Every field initialized recursively            |
| External C++ types                | Native value initialization, checked by C++    |

Ordinary classes, numeric and payload enums, callable values/views, void, and entry or iteration-only opaque types have no default. A struct or nonempty array containing them also has no default. A zero-length array needs no element default. Unsupported requests report `CV-TYPE-DEFAULT-INITIALIZATION`.

Local declarations still require an initializer; array literals still require their exact element count. Default construction does not extend borrows or relax access. Runtime, interpretation, and constant execution share defaults within each mode's supported subset; native defaults remain delegated to C++.

## Ordinary value classes

A `class` is an encapsulated nominal value: private fields plus operations declared in its body. It adds no heap allocation, reference identity, inheritance, virtual dispatch, or custom copy, move, or destruction hooks. Field types determine copying, ownership, stored borrows, and destruction under the same rules as structs.

```carven
class Counter {
    value: i32,

    fn create(value: i32) -> Counter => { value: value };
    fn read(self) -> i32 => self.value;

    fn increment(&self) {
        self.value += 1;
    }
}

var counter = Counter::create(3);
counter.increment();
println(counter.read(), counter); // 4 Counter
```

Fields end in commas (the last may omit it) and may be interleaved with operations. A class body cannot contain nested declarations, `const fn`, or C++ import/export operations.

| Form                   | Meaning                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `fn name(params)`      | Associated operation, called as `Type::name(...)`; `Type::name` is also its callable value |
| `fn name(self, ...)`   | Instance operation with a Read receiver                                                    |
| `fn name(&self, ...)`  | Instance operation with a Write receiver; preserves the original updatable place           |
| `fn name(&&self, ...)` | Instance operation that Takes the complete owner                                           |
| `private fn ...`       | Accessible only inside this class body                                                     |

A first parameter named `self` must omit its type annotation; `self` cannot name a later class-operation parameter. A free-function parameter or ordinary local binding named `self` does not acquire receiver meaning.

Instance operations are called as `expression.name(...)`. The receiver evaluates once, before the explicit arguments, and binds by ordinary Read, Write, or Take rules; explicit arguments still need their own access markers. An instance operation cannot be selected as a standalone value. There is no `static` keyword, member overloading, or implicit `self` lookup: inside an operation, fields are reached only as `self.field`.

Selecting fields and constructing the representation are allowed only in the lexical body of the defining class. That authority covers other values of the same class and lambdas written inside its operations, but not module peers or free functions they call. Outside the body, `counter.value`, `Counter { value: 1 }`, and `let c: Counter = {};` report `CV-ACCESS-CLASS-PRIVATE`; calling a `private fn` from outside reports the same code. Ordinary operations follow the class's own `private`/`export` audience. Operations do not enter the module namespace, and fields and operations share one namespace in which each name is unique.

Construction inside the body must supply every field; there is no automatic default, including through a containing struct or nonempty array. `{}` in a class returning itself therefore reports `CV-TYPE-DEFAULT-INITIALIZATION` unless the class has no fields. A type name is not callable.

A class has no implicit equality: `a == b`, including through a struct containing a class field, reports `CV-TYPE-EQUALITY-UNSUPPORTED`. Write an operation when a comparison is needed. [Structural display](/reference/formatting/#structural-display) prints only the class name. Required constant evaluation rejects class values and operations with `CV-CONST-ADMISSION`. Class representation patterns do not exist. Generated C++ represents class operations as ordinary functions taking the receiver as a parameter.

## Contextual construction

When an expression has a known expected type, a construction may omit that type: `{ field: value }` constructs it by name, and `{}` requests its default. Field checking, class representation access, ownership, borrowing, and constant-execution admission are the same as for the spelled form. Named fields require `field: value`; shorthand such as `{ quantity, amount }` is unsupported. Positional construction keeps its explicit type; `{ 1, 2 }` is a syntax error.

```carven
struct Point {
    x: i32,
    y: i32,
}

struct Segment {
    start: Point,
    end: Point,
}

fn origin() -> Point => { x: 0, y: 0 };

fn width(segment: Segment) -> i32 => segment.end.x - segment.start.x;

var text: String = {};
text.append("ok");
let points: [Point; 2] = [origin(), { x: 3, y: 4 }];
let segment = Segment { start: {}, end: points[1] };
println(text, width(segment), width({ start: origin(), end: { x: 5, y: 0 } }));
```

This prints `ok 3 5`. Expected types come from declared function and callable results, annotated bindings, assignment destinations, resolved Carven parameters, record fields, and known array element types; value-control branches receive their surrounding expected type. A type already established by forward analysis of array elements or branches may also supply context. No later use is searched, and `let point = { x: 1, y: 2 };` reports `CV-TYPE-CONSTRUCT-CONTEXT`.

There is no structural search by field names and no failure-type selection: `throw { code: 404 };` also reports `CV-TYPE-CONSTRUCT-CONTEXT`, so spell the failure type. For `-> T throw E`, a returned construction uses `T`. Native C++ types never infer construction; `{}` for an external result reports `CV-TYPE-CONSTRUCT-CONTEXT`.

At the start of a match or catch arm body, `{ field: value }` is a construction but `{}` is an empty branch block. Write `({})` for an empty construction arm:

```carven
fn pick(flag: bool) -> Point => match flag {
    true => { x: 1, y: 0 },
    false => ({}),
};
```

This fragment uses `Point` from the previous example. The braces of a block-bodied function, an if arm, or a try body still delimit a block; its final expression may itself be a contextual construction.

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

An enum has at least one case. If all cases have no payload, it is numeric. Its default backing type is `i32`; an explicit backing type must be an integer.

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

fn reply(value: i32) -> Reply => .Number(value);

let empty: Reply = .Empty;
println(reply(3) == .Number(3), empty == .Empty); // true true
```

Payload cases are first-class constructors; payload-free cases are values. A payload constructor requires exactly its parameter count. Do not append `()` to a payload-free case.

`.Case` and `.Case(...)` need an enum type from a binding, return, assignment, argument, aggregate position, or unambiguous adjacent operand. Case names are not searched globally and cannot be imported alone. A full name such as `Reply::Number(3)` specifies the owner explicitly.

The declared result of `reply` supplies the owner for `.Number(value)`; the annotated binding supplies it for `.Empty`.

Equality compares the case first. Different cases are unequal; matching cases compare payload positions with short-circuiting. A payload enum supports equality only when every payload supports it.

## Recursive storage and visibility

The by-value storage graph formed by struct fields, enum payloads, and array elements must be acyclic. Even zero-length arrays retain an element-type edge. Function parameters and results do not form storage edges. Pointers do not own their targets and can support recursive structures. Published field and payload types must be visible to the declaration's audience. Class fields are private to the class body and may use module-private types; class operations remain subject to their declared audience.
