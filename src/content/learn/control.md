---
title: "Choose branches and repeat work"
description: "Organize execution with conditions, integer ranges, pattern matching, and loop updates."
section: learn
lesson: 3
source: docs/language/control-flow.md
---

## Produce a value with a condition

Choose a stock label from the quantity, then print that label. Use an if expression to produce the selected text:

```carven run
let quantity = 3;
let label = if quantity > 0 { "in stock" } else { "empty" };
println(label);
```

The output is `in stock`. A value-producing if needs else and compatible branch result types. The final expression without a semicolon supplies the branch value; with a semicolon it is an ordinary statement.

## Keep local names inside a branch

Calculate a temporary price inside a branch, then read the original price afterward. Save this separate program as main.cv:

```carven run
let price = 12;

if price < 20 {
    let price = price + 3;
    println(price);
}

println(price);
```

Run `carven main.cv`. It prints `15` and `12` on separate lines. The inner price is a new binding; its initializer reads the outer price. After the branch ends, the outer binding is visible again.

## Sum a range

```carven run
var total = 0;

for value in 1..5 {
    total += value;
}

println(total);
```

The output is `10`. `1..5` includes 1, 2, 3, and 4, but not 5. Each endpoint is evaluated once. If the start is not less than the end, there are no iterations. Each integer range binding is read-only; the loop supplies its next value.

`1..=4` also visits 1, 2, 3, and 4: `..=` includes the upper bound. `1..1` is empty, while `1..=1` contains one 1. Both forms are empty when the start exceeds the end.

## Save a range

```carven run
var end = 4;
let values: Range<i32> = 1..=end;
end = 8;

var total = 0;
for value in values {
    total += value;
}
println(values, total);
```

The output is `1..=4 10`. Creating values saved the bounds 1 and 4; changing end to 8 does not change it. `println` shows a range by its bounds. `Range<i32>` is the integer range type. Ranges can be stored like other values and, once you introduce functions, passed as arguments or returned.

The loop also snapshots its source range before traversal. Reassigning that range inside the body does not change the sequence being visited.

## Let a bound choose the integer type

```carven run
let code = "A-17";
let positions = 0..code.byte_length();
println(positions);

for index in positions {
    println(index);
}
```

This prints `0..4`, then 0 through 3 on separate lines. `code.byte_length()` returns a usize byte count. usize is an unsigned integer type used for lengths and indices. This gives the literal 0 the same type, so positions has type `Range<usize>`. See [expected types](/reference/types/) when combining bounds of different integer types.

## Choose a result by interval

```carven run
let score = 85;
let label = match score {
    ..0 => "invalid",
    0..60 => "retry",
    60..=100 => "pass",
    101.. => "invalid",
};
println(label);
```

The output is `pass`. Read the arms in order: below 0 is invalid; 0 through 59 needs a retry; 60 through 100 passes; above 100 is invalid. The patterns `..0` and `101..` omit one bound. This is allowed only in patterns, not when creating a range value.

match selects the first matching arm and checks coverage of all inputs. Removing the `101..` arm produces a missing-coverage error. Use match to classify a value; use if to decide actions from general conditions.

Bounds can also be runtime values; then a `_` fallback is usually needed. See the [control-flow Reference](/reference/control/) for bound evaluation and dynamic-pattern coverage rules.

## while and C-style for

Print successive indices with while, then repeat with a C-style for that skips index 1:

```carven run
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
```

This prints 0, 1, 2, 0, and 2 on separate lines. `++` increases its variable by one. `continue` skips the rest of the body; in a C-style for, it executes the update step before checking the condition. while checks its condition before each execution of the body. A C-style for always requires its condition.

Use a conditionless while when the body decides when to stop. In this separate main.cv, find the first positive integer whose square is at least 20:

```carven run
var candidate = 1;

while {
    if candidate * candidate >= 20 {
        break;
    }
    ++candidate;
}

println(candidate);
```

Run `carven main.cv` to print `5`. `break` exits the loop immediately, leaving candidate at the value that passed the check.

## Evaluate only the selected path

`&&` and `||` can skip work: `&&` stops when its left side is false; `||` stops when its left side is true. Likewise, only the selected if or match branch runs.

Guard a division when the input count may be zero. Run this separate main.cv with `carven main.cv`:

```carven run
let count = 0;
let enough = count != 0 && 100 / count >= 10;
let empty_or_enough = count == 0 || 100 / count >= 10;

println(enough, empty_or_enough);
```

It prints `false true`. Both conditions skip division: the first stops at false, the second at true. Change count to 4; both evaluate the division and print `true true`.

Every branch must contain valid code, even inside `if false`. The [compile-time chapter](/learn/constants/) introduces const if when the choice should affect the generated program.

## Exercise

Compare `1..1` with `1..=1` in the summing example: expect 0 and 1. Then use `1..6` and skip 3; expect 12, and reproduce it with while. Try scores -1, 59, 60, 100, and 101 to check each classification boundary. Finally, change the text in the bound example to `"order-1024"` and predict the printed range.
