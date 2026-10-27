---
title: "Records and collections"
description: "Group related fields, represent alternative states, and keep a collection that can grow."
section: learn
lesson: 5
source: docs/language/aggregates.md
---

## A struct represents a record

Keep a product's price and quantity in one value, then pass that value to a total calculation. Declare the two fields in a struct:

```carven run
struct Item {
    price: i32,
    quantity: i32,
}

fn total(item: Item) -> i32 => item.price * item.quantity;

let item = Item { quantity: 3, price: 12 };
println(total(item));
println(item);
```

The output is:

```text
36
Item {
    price: 12,
    quantity: 3,
}
```

Field names match the declaration, and each field is initialized exactly once. Named construction evaluates in written order; positional construction such as `Item { 12, 3 }` maps to declaration order. `println(item)` shows the type name and each field in declaration order, without any formatting code. Struct types have declaration identity: matching fields do not make two structs compatible. Code that can use the struct can also read and construct its fields. To restrict field access to defined operations, use a class. The [access chapter](/learn/ownership/#control-field-access-with-a-class) introduces classes.

## Start from defaults

Replace the last three lines of the first example, keeping `Item` and `total`:

```carven
let item = Item {};
println(total(item));
println(item);
```

The output is:

```text
0
Item {
    price: 0,
    quantity: 0,
}
```

Empty braces default-initialize the whole `Item`, so both integers are zero. To supply some fields and default the rest, write `Item { price: 12, ... }`: quantity becomes zero. The trailing `...` must be last, with no comma after it. Without that marker, `Item { price: 12 }` is incomplete.

Use defaults when zero or empty is a meaningful starting state; assign business values explicitly otherwise. The [aggregate reference](/reference/aggregates/) lists each type's default initialization rules.

## Construct a struct from its expected type

When the type is already known, construction can omit it. Replace the lines after `total` again:

```carven
fn sample() -> Item => { price: 12, quantity: 3 };

let empty: Item = {};
println(total(empty), total(sample()));
println(total({ price: 5, quantity: 2 }));
```

The output is `0 36`, then `10`. The result type of `sample`, the annotation on empty, and `total`'s parameter each supply `Item`. `{}` default-initializes it. Named construction can also use the trailing default marker: `let sample: Item = { price: 12, ... };`.

Without an expected type, `let item = { price: 12, quantity: 3 };` is rejected with `CV-TYPE-CONSTRUCT-CONTEXT`; Carven does not search for a struct with matching field names. See the [aggregate reference](/reference/aggregates/) for the other construction contexts.

## Arrays and iteration

```carven run
let counts = [1, 2, 3];
var total = 0;

for count in counts {
    total += count;
}

println(total);
println(counts);
```

The output is `6`, followed by the array with one element per line:

```text
6
[
    1,
    2,
    3,
]
```

Length is part of the type. An empty array needs an annotation such as `[i32; 0]`. Dynamic out-of-bounds indexing terminates; constant out-of-bounds indexing is diagnosed at compile time. The loop reads each element in order. The next chapter introduces Write access for modifying existing storage.

## Enums represent alternative states

```carven run
enum Reply {
    Empty,
    Number(i32),
}

fn describe(reply: Reply) -> i32 => match reply {
    .Empty => 0,
    .Number(value) => value,
};

println(describe(Reply::Number(42)), describe(.Empty));
println(Reply::Number(42));
```

The output is:

```text
42 0
Reply::Number(
    42,
)
```

Construct payload cases with a call; a payload-free case is already a value. match must be exhaustive, so adding a case may require updating existing matches. A bare pattern name creates a binding; `_` ignores the payload. `println` shows the case and its payload.

The `.Empty` shorthand works because `describe`'s parameter supplies the expected enum. See the [enum reference](/reference/aggregates/) for numeric enums and explicit case values.

## Pattern guards and exhaustiveness

Classify positive payloads separately. Keep `Reply` from the previous program and replace `describe` and the following print statements with:

```carven
fn describe(reply: Reply) -> i32 => match reply {
    .Empty => 0,
    .Number(value) if value > 0 => value,
    .Number(_) => -1,
};

println(describe(.Empty), describe(.Number(42)), describe(.Number(-3)));
```

Run `carven run main.cv`. It prints `0 42 -1`. The guard accepts 42 and rejects -3; the later `.Number(_)` covers that remaining payload. Removing the fallback leaves the match incomplete. Make changes to matched data in the selected arm body, after its guard has passed.

## Grow a collection with `Vector`

An array's length is fixed in its type. When a filtering step decides how many results to keep, use a `Vector` instead:

```carven run
var accepted: Vector<i32> = [];
for reading in [18, -3, 21] {
    if reading >= 0 => accepted.push(reading);
}

let first = accepted.remove(0);
println(first, accepted.length(), accepted[0]);
```

This prints `18 1 21`. The vector starts empty; push appends the two nonnegative readings. remove(0) removes and returns the first element, leaving 21 at index zero. Indices start at zero, `accepted[0]` reads that element, and length() counts the remaining elements. The annotation `Vector<i32>` selects the element type.

The [Vector reference](/reference/aggregates/) lists collection operations. The next chapter explains copying, changing, and transferring existing values.

## Parameterize a record's value type

A sensor reading always needs a sensor identifier, but its value may be an integer count or a floating voltage. A type parameter lets both records share one definition:

```carven run
struct Reading<T> {
    sensor: i32,
    value: T,
}

let count = Reading<i32> { sensor: 101, value: 21 };
let voltage = Reading<f64> { sensor: 102, value: 3.3 };
println(count.value, voltage.value);
```

The output is `21 3.3`. T is a placeholder for a type. `Reading<i32>` chooses `i32` for value; `Reading<f64>` chooses `f64`. Each is a concrete type, so the compiler still checks every field. This is useful when the surrounding structure stays the same while one kind of data varies.

## Exercise

Return to the `Reply`/`describe` program. Add `Pair(i32, i32)` to `Reply` and return the sum of its payloads from `describe`. Omit the Pair arm and inspect the `CV-MATCH-NON-EXHAUSTIVE` diagnostic. After adding it, `describe(.Pair(20, 22))` should produce 42. Then return to the `Item` program. Write `bulk() -> Item` with an expression body that constructs `{ price: 10, quantity: 12 }` without naming `Item`, and print its result.
