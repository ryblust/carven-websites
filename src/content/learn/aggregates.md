---
title: "Organize data as records and collections"
description: "Group related fields, represent alternative states, and keep a collection that can grow."
section: learn
lesson: 5
source: docs/language/aggregates.md
---

## A struct represents a record

```carven
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

Field names match the declaration, and each field is initialized exactly once. Named construction evaluates in written order; positional construction such as `Item { 12, 3 }` maps to declaration order. `println(item)` shows the type name and each field in declaration order, without any formatting code. Struct types have declaration identity: matching fields do not make two structs compatible. Code that can use the struct can also read and construct its fields. To restrict field access to defined operations, use a class. The [access chapter](/learn/ownership/#keep-fields-behind-a-class) introduces classes.

## Start from defaults

Replace the last three lines of the first example, keeping Item and total:

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

Empty braces default-initialize the whole Item, so both integers are zero. Once you specify fields, provide all of them: `Item { price: 12 }` does not fill in quantity automatically.

Use defaults when zero or empty is a meaningful starting state; assign business values explicitly otherwise. Numbers start at zero, bool at false, text and vectors empty. Arrays and structs apply defaults to each element or field. An enum has no automatic choice of case, so a struct containing one needs an explicit value. The [aggregate reference](/reference/aggregates/) lists defaults for the remaining types.

## Let the expected type name the struct

When the type is already known, construction can omit it. Replace the lines after total again:

```carven
fn sample() -> Item => { price: 12, quantity: 3 };

let empty: Item = {};
println(total(empty), total(sample()));
println(total({ price: 5, quantity: 2 }));
```

The output is `0 36`, then `10`. The result type of sample, the annotation on empty, and total's parameter each supply Item. Assignments, struct fields, and array elements with a known type work the same way. The braces follow the same rules as the spelled form: `{}` default-initializes, and named fields must all be present.

Without an expected type, `let item = { price: 12, quantity: 3 };` is rejected with `CV-TYPE-CONSTRUCT-CONTEXT`; Carven does not search for a struct with matching field names. Positional construction keeps its explicit type. At the start of a match arm, `{}` is an empty block, so write `({})` for an empty construction there. See the [aggregate Reference](/reference/aggregates/) for every context that supplies a type.

## Arrays and iteration

```carven
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

```carven
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

An enum with only payload-free cases is a numeric enum and may specify an integer backing type and values. An enum with payloads cannot also assign integer values. The `.Empty` shorthand in the call works because describe's parameter supplies the expected enum; it does not search globally for cases.

## Guards and coverage

An arm can read `.Number(value) if value > 0 => value,`, but the guard may reject the value. A later `.Number(_)` must cover the rest. Use the guard to decide whether the arm applies; make changes in the selected arm body.

## Grow a collection with Vector

An array's length is fixed in its type. When a filtering step decides how many results to keep, use a Vector instead:

```carven
var accepted: Vector<i32> = [];
for reading in [18, -3, 21] {
    if reading >= 0 {
        accepted.push(reading);
    }
}
let first = accepted.remove(0);
println(first, accepted.length(), accepted[0]);
```

This prints `18 1 21`. The input is a fixed array of three readings. The vector starts empty, keeps the two nonnegative readings, then removes and returns its first element. The remaining value moves to index zero. The annotation `Vector<i32>` tells `[]` and push which element type to use.

Use push to append, length to count, and remove to take an element out while keeping the rest in order. Copying a vector produces independent contents. The next chapter explains changing and transferring existing values. The text chapter shows how to keep independent strings in a vector.

## Reuse a record shape with different value types

A sensor reading always needs a sensor identifier, but its value may be an integer count or a floating voltage. A type parameter lets both records share one definition:

```carven
struct Reading<T> {
    sensor: i32,
    value: T,
}

let count = Reading<i32> { sensor: 101, value: 21 };
let voltage = Reading<f64> { sensor: 102, value: 3.3 };
println(count.value, voltage.value);
```

The output is `21 3.3`. T is a placeholder for a type. `Reading<i32>` chooses i32 for value; `Reading<f64>` chooses f64. Each is a concrete type, so the compiler still checks every field. This is useful when the surrounding structure stays the same while one kind of data varies.

## Exercise

Add `Pair(i32, i32)` to Reply and return the sum of its payloads from describe. Omit the Pair arm and inspect the `CV-MATCH-NON-EXHAUSTIVE` diagnostic. After adding it, `describe(.Pair(20, 22))` should produce 42. Finally, write a function `bulk() -> Item` whose expression body constructs `{ price: 10, quantity: 12 }` without naming Item, and print it.
