---
title: "Capture state and pass behavior"
description: "Move from value captures to Write captures, and distinguish owning closures from non-owning views."
section: learn
lesson: 10
source: docs/language/functions.md
---

## Capture a snapshot

```carven
var factor = 2;
let scale = [factor](item: i32) => item * factor;
factor = 10;
println(scale(21), factor);
```

The output is `42 10`. `[factor]` copies the value when the closure is created. Reassigning the outer factor later does not replace that capture. The expression after `=>` is the lambda's result, which suits a short lambda with one calculation; use a block body when it needs several statements, as in the next example. A lambda must have a capture list; use `[]` when it captures nothing.

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

`let copy = scale;` retains the concrete closure type and copies its captures. `let view: fn(i32) -> i32 = scale;` creates a non-owning view that borrows the capturing closure object. The view neither copies captures nor extends the owner's life. While the view borrow exists, the source closure cannot be Taken.

A capturing lambda temporary may be passed as a direct argument; its storage lasts for the whole call. A view cannot be returned from a function, stored in a struct or enum, or captured by another lambda. Arrays of views share these restrictions. A concrete closure result can be inferred when returning a closure, but any Write referent must survive.

A callable parameter can also declare the [failure contract](/learn/failures/) its caller must handle, such as `fn(i32) -> i32 throw InvalidQuantity`. A callback with fewer failures can fit a wider contract. An immutable local initialized directly from a known function keeps that function's own contract: after `let widened: fn(i32) -> i32 throw InvalidQuantity = double;`, where double never fails, `widened(21)` needs no `?`. A parameter of the same type uses the view's contract. Copying a view and widening an existing view have different borrowing behavior; see the [callable-view Reference](/reference/closures/) before retaining or rebinding such views.

## Exercise

Copy advance in the second program and alternate calls to the copies: count is still shared. Changing the capture to `[count]` makes assignment in the body invalid. Rewrite it to return a read-only result, and compare a snapshot with an alias.
