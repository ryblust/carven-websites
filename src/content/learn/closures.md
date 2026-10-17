---
title: "Capture state and pass behavior"
description: "Keep state with a function, share updates deliberately, and pass a policy as a callback."
section: learn
lesson: 11
source: docs/language/functions.md
---

## Capture a snapshot

Sometimes the operation stays the same but its settings vary: multiply every item by a chosen factor, for example. A closure is a small function that keeps the state it needs. The bracketed capture list says which outside values it remembers.

```carven
var factor = 2;
let scale = [factor](item: i32) => item * factor;
factor = 10;
println(scale(21), factor);
```

The output is `42 10`. `[factor]` copies the value when the closure is created. Reassigning the outer factor later does not replace that capture. The expression after => is the result. This form suits a short calculation. For several statements, use a block body, as in the next example. A lambda must have a capture list; use `[]` when it captures nothing.

## Modify outer storage

```carven
var count = 0;
let advance = [&count]() {
    count += 1;
    return count;
};

println(advance(), advance(), count);
```

The output is `1 2 2`. A Write capture requires a writable source and holds an alias to that same storage. Declaring the closure owner with `let` does not revoke the captured Write permission. Captures cannot Take; there is no `[&&count]`.

## Pass behavior to a function

```carven
fn apply(callback: fn(i32) -> i32, value: i32) -> i32 => callback(value);

let factor = 2;
let scale = [factor](item: i32) => item * factor;
println(apply(scale, 21));
```

The output is `42`. The parameter type `fn(i32) -> i32` describes a callable taking `i32` and returning `i32`. Passing scale here creates a non-owning callable view: apply invokes the original closure while that closure remains alive for the call.

## Owning closures and views

Copying a closure and borrowing it solve different problems. `let copy = scale;` makes another closure with copied captures. `let view: fn(i32) -> i32 = scale;` only borrows scale so it can be called through a common signature. The view does not keep scale alive; scale must remain in scope and cannot be transferred away while the view exists.

A callback parameter is a good use for such a short-lived view. To return a closure from a function, let the compiler infer its concrete type instead of returning a view of a local closure. Any variables accessed through a Write capture must still outlive the returned closure.

A callback signature can include a [failure contract](/learn/failures/), such as `fn(i32) -> i32 throw InvalidQuantity`. The calling function must handle or propagate that contract. For storing views, adapting failure contracts, or returning closures, consult the [callable-view reference](/reference/closures/) for the additional restrictions.

## Filter an owned result through a borrowed callback

Use a callable view to keep the collection algorithm independent from application policy:

```carven
fn select(values: [i32], accept: fn(i32) -> bool) -> Vector<i32> {
    var result: Vector<i32> = [];
    for value in values {
        if accept(value) {
            result.push(value);
        }
    }
    return &&result;
}

let minimum = 20;
let enough = [minimum](value: i32) => value >= minimum;
let selected = select([18, 21, 32], enough);
println(selected.length(), selected[0]);
```

The output is `2 21`. The array and callback are borrowed for the call; selected owns its numbers and survives that call. The policy closure owns its captured threshold. This function does not retain the callable view in the result. Capturing runtime state still requires a native run; the semantic interpreter does not execute capturing closures. The [input project](/learn/data-pipeline/) uses named pure helpers when the same validation must run during compilation.

## Exercise

Copy advance in the second program and alternate calls to the copies: count is still shared. Changing the capture to `[count]` makes assignment in the body invalid. Rewrite it to return a read-only result, and compare a snapshot with an alias.
