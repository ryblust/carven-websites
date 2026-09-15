---
title: "Closures and callbacks"
description: "Move from value captures to Write captures, and distinguish owning closures from non-owning views."
section: learn
lesson: 8
source: docs/semantics.md
---

## Capture a snapshot

```carven
fn apply(callback: fn(i32) -> i32, value: i32) -> i32 {
    return callback(value);
}

fn main() {
    var offset = 2;
    let add = [offset](value: i32) => value + offset;
    offset = 10;
    println(add(40), apply(add, 40), offset);
}
```

The output is `42 42 10`. `[offset]` copies the value when the closure is created. Reassigning the outer offset later does not replace that capture. A lambda must have a capture list; use `[]` when it captures nothing.

## Modify outer storage

```carven
fn main() {
    var count = 0;
    let advance = [&count]() {
        count += 1;
        return count;
    };

    println(advance(), advance(), count);
}
```

The output is `1 2 2`. A Write capture requires a writable source and holds an alias to that same storage. Declaring the closure owner with let does not revoke the captured Write permission. Captures cannot Take; there is no `[&&count]`.

## Owning closures and views

`let copy = add;` retains the concrete closure type and copies its captures. `let view: fn(i32) -> i32 = add;` creates a non-owning view that borrows the capturing closure object. The view neither copies captures nor extends the owner's life. While the view borrow exists, the source closure cannot be Taken.

A capturing lambda temporary may be passed as a direct argument; its storage lasts for the whole call. A view cannot be returned from a function, stored in a struct or enum, or captured by another lambda. Arrays of views share these restrictions. A concrete closure result can be inferred when returning a closure, but any Write referent must survive.

Copying a view of the same type saves its target description. Widening the failure set of an existing view borrows the source view slot instead, so it observes rebinding of that slot. The failure chapter introduces these sets.

## Exercise

Copy advance in the second program and alternate calls to the copies: count is still shared. Changing the capture to `[count]` makes assignment in the body invalid. Rewrite it to return a read-only result, and compare a snapshot with an alias.
