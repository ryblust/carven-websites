---
title: "Model data with structs, arrays, and enums"
description: "Group related data and express states with exhaustive patterns."
section: learn
lesson: 4
source: docs/semantics.md
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

Field names match the declaration, and each field is initialized exactly once. Named construction evaluates in written order; positional construction such as `Item { 12, 3 }` maps to declaration order. `println(item)` shows the type name and each field in declaration order, without any formatting code. Struct types have declaration identity: matching fields do not make two structs compatible. Any code in a struct's audience can read and construct its fields; when a value must keep its fields behind its own operations, use a class, introduced in the [access chapter](/learn/ownership/#keep-fields-behind-a-class).

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

Defaults can represent an empty state; assign meaningful business values explicitly. Enums have no default case, so choose a state explicitly.

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

An arm can read `.Number(value) if value > 0 => value,`, but the guard may reject the value. A later `.Number(_)` must cover the rest. Pattern bindings are copied before the guard executes. A guard cannot modify overlapping storage being matched; the selected arm body can.

## Exercise

Add `Pair(i32, i32)` to Reply and return the sum of its payloads from describe. Omit the Pair arm and inspect the `CV-MATCH-NON-EXHAUSTIVE` diagnostic. After adding it, `describe(.Pair(20, 22))` should produce 42. Finally, write a function `bulk() -> Item` whose expression body constructs `{ price: 10, quantity: 12 }` without naming Item, and print it.
