---
title: "Capture state and pass behavior"
description: "Keep state with a function, share updates deliberately, and pass a policy as a callback."
section: learn
lesson: 11
source: docs/language/functions.md
---

## Capture a snapshot

Sometimes the operation stays the same but its settings vary: multiply every item by a chosen factor, for example. A closure is a small function that keeps the state it needs. The bracketed capture list says which outside values it remembers.

Run this lesson's examples with `carven run main.cv` or `carven interpret main.cv`. Both execute source closures and their captures.

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
println(apply(scale, 21), apply([](item) => item + 1, 21));
```

The output is `42 22`. The parameter type `fn(i32) -> i32` describes a callable taking `i32` and returning `i32`. Passing `scale` creates a non-owning callable view: `apply` invokes the original closure while that closure remains alive for the call. The second call passes a lambda directly. It needs no outside values, so its capture list is `[]`. The expected callback type supplies `i32` for item, allowing its annotation to be omitted.

## Owning closures and views

Save this separate program as `multiplier.cv` to return an owning closure, then copy and borrow it:

```carven
fn multiplier(factor: i32) => [factor](item: i32) => item * factor;

let scale = multiplier(2);
let copy = scale;
let view: fn(i32) -> i32 = scale;

println(copy(21), view(21));
```

Run `carven run multiplier.cv`. It prints `42 42`. The returned closure owns a copy of factor and remains usable after `multiplier` returns. copy is another closure owner; view borrows `scale`'s closure object.

The view does not keep `scale` alive: `scale` must remain in scope and cannot be transferred while the view exists. Return the closure itself, not a view of a local closure. Variables accessed through a returned Write capture must also outlive the closure.

See the [callable-view reference](/reference/closures/) for stored views and callback failure contracts.

## Filter an owned result through a borrowed callback

Use a callable view to keep the collection algorithm independent from application policy:

```carven
fn select(values: [i32], accept: fn(i32) -> bool) -> Vector<i32> {
    var result: Vector<i32> = [];
    for value in values {
        if accept(value) => result.push(value);
    }
    return result;
}

let minimum = 20;
let enough = [minimum](value: i32) => value >= minimum;
let selected = select([18, 21, 32], enough);
println(selected.length(), selected[0]);
```

The output is `2 21`. The array and callback are borrowed for the call; selected owns its numbers and survives that call. The policy closure owns its captured threshold. This function does not retain the callable view in the result.

## Use a typed callback in a generic function

A callback signature can depend on type parameters:

```carven run
fn apply<T, U>(value: T, callback: fn(T) -> U) -> U => callback(value);

let suffix = "!";
let label = [suffix](value: i32) => f"item {value}{suffix}";
println(apply(42, label));
```

The output is `item 42!`. The call infers `T` as `i32` and `U` as `String` from the value and callback. The callback remains a borrowed view for the duration of `apply`.

A known lambda can also execute during compilation when its body meets static execution requirements. Save this separate program and run `carven check main.cv`:

```carven
const test "captured factor" {
    let factor = 2;
    let scale = [factor](value: i32) => value * factor;
    check(scale(21) == 42);
}
```

Named source functions called in that stage still require `const fn`. The [next chapters](/learn/constants/) develop static execution in more detail.

## Exercise

Copy `advance` in the second program and alternate calls to the copies: count is still shared. Changing the capture to `[count]` makes assignment in the body invalid. Rewrite it to return a read-only result, and compare a snapshot with an alias.
