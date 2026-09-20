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

fn main() {
    let item = Item { quantity: 3, price: 12 };
    println(total(item));
}
```

The output is `36`. Field names match the declaration, and each field is initialized exactly once. Named construction evaluates in written order; positional construction maps to declaration order. Struct types have declaration identity: matching fields do not make two structs compatible.

## Start from defaults

Replace main in the first example with this body, keeping Item and total:

```carven
fn main() {
    let item = Item {};
    println(total(item));
    println(item);
}
```

The output is:

```text
0
Item {
    price: 0,
    quantity: 0,
}
```

Empty braces default-initialize the whole Item, so both integers are zero. `println(item)` shows its fields directly. Once you specify fields, provide all of them: `Item { price: 12 }` does not fill in quantity automatically.

Defaults can represent an empty state; assign meaningful business values explicitly. Enums have no default case, so choose a state explicitly.

## Arrays and iteration

```carven
fn main() {
    let counts = [1, 2, 3];
    var total = 0;

    for count in counts {
        total += count;
    }

    println(total);
}
```

The output is `6`. Length is part of the type. An empty array needs an annotation such as `[i32; 0]`. Dynamic out-of-bounds indexing terminates; constant out-of-bounds indexing is diagnosed at compile time. The loop reads each element in order. The next chapter introduces Write access for modifying existing storage.

## Enums represent alternative states

```carven
enum Reply {
    Empty,
    Number(i32),
}

fn describe(reply: Reply) -> i32 {
    return match reply {
        .Empty => 0,
        .Number(value) => value,
    };
}

fn main() {
    println(describe(Reply::Number(42)), describe(Reply::Empty));
}
```

The output is `42 0`. Construct payload cases with a call; a payload-free case is already a value. match must be exhaustive, so adding a case may require updating existing matches. A bare pattern name creates a binding; `_` ignores the payload.

An enum with only payload-free cases is a numeric enum and may specify an integer backing type and values. An enum with payloads cannot also assign integer values. The `.Number(42)` shorthand requires an expected enum context; it does not search globally for cases.

## Guards and coverage

An arm can read `.Number(value) if value > 0 => value,`, but the guard may reject the value. A later `.Number(_)` must cover the rest. Pattern bindings are copied before the guard executes. A guard cannot modify overlapping storage being matched; the selected arm body can.

## Exercise

Add `Pair(i32, i32)` to Reply and return the sum of its payloads from describe. Omit the Pair arm and inspect the exhaustiveness diagnostic. After adding it, `Pair(20, 22)` should produce 42.
