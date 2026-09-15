---
title: "Conditions, loops, and expressions"
description: "Build clear control flow with bool conditions, half-open ranges, and loop updates."
section: learn
lesson: 3
source: docs/semantics.md
---

## Produce a value with a condition

```carven
fn main() {
    let quantity = 3;
    let label = if quantity > 0 { "in stock" } else { "empty" };
    println(label);
}
```

The output is `in stock`. A value-producing if needs else and compatible branch result types. The final expression without a semicolon supplies the branch value; with a semicolon it is an ordinary statement.

## Sum a range

```carven
fn main() {
    var total = 0;

    for value in 1..5 {
        total += value;
    }

    println(total);
}
```

The output is `10`. `1..5` includes 1, 2, 3, and 4, but not 5. Each endpoint is evaluated once. If the start is not less than the end, there are no iterations. Integer range bindings provide Read access and cannot have a Write marker.

## while and C-style for

```carven
fn main() {
    var index = 0;

    while index < 3 {
        println(index);
        ++index;
    }

    for var i = 0; i < 3; ++i {
        if i == 1 {
            continue;
        }
        println(i);
    }
}
```

This prints 0, 1, 2, 0, and 2 on separate lines. In a C-style for, continue executes the step before checking the condition. break exits immediately. while checks its condition before each execution of the body.

## Short-circuiting and failures

`&&` skips its right operand when the left is false; `||` skips it when the left is true. Only the chosen branch runs, but all source branches undergo type and failure-consumption checks. Placing invalid code inside `if false` does not make it valid.

Branches of value-producing if/match/try cannot return to the enclosing function or break/continue an enclosing loop. Use the statement form when you need those outward transfers.

## Exercise

Change the sum range to 1..1; expect 0. Then use 1..6 and skip 3; expect 12. Produce the same result with while.
