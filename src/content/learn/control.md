---
title: "Choose branches and repeat work"
description: "Organize execution with conditions, integer ranges, pattern matching, and loop updates."
section: learn
lesson: 2
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

The output is `10`. `1..5` includes 1, 2, 3, and 4, but not 5. Each endpoint is evaluated once. If the start is not less than the end, there are no iterations. Each integer range binding is read-only; the loop supplies its next value.

`1..=4` also visits 1, 2, 3, and 4: `..=` includes the upper bound. `1..1` is empty, while `1..=1` contains one 1. Both forms are empty when the start exceeds the end.

## Save a range

```carven
fn main() {
    var end = 4;
    let values: range<i32> = 1..=end;
    end = 8;

    var total = 0;
    for value in values {
        total += value;
    }
    println(total);
}
```

The output is still `10`. Creating values saved the bounds 1 and 4; changing end to 8 does not change it. `range<i32>` is the integer range type. Ranges can be stored like other values and, once you introduce functions, passed as arguments or returned.

The loop also snapshots its source range before traversal. Reassigning that range inside the body does not change the sequence being visited.

## Choose a result by interval

```carven
fn main() {
    let score = 85;
    let label = match score {
        ..0 => "invalid",
        0..60 => "retry",
        60..=100 => "pass",
        101.. => "invalid",
    };
    println(label);
}
```

The output is `pass`. Read the arms in order: below 0 is invalid; 0 through 59 needs a retry; 60 through 100 passes; above 100 is invalid. The patterns `..0` and `101..` omit one bound. This is allowed only in patterns, not when creating a range value.

match selects the first matching arm and checks coverage of all inputs. Removing the `101..` arm produces a missing-coverage error. Use match to classify a value; use if to decide actions from general conditions.

### Equivalent C++20

```cpp
#include <iostream>
#include <string_view>

int main() {
    const int score = 85;
    const std::string_view label = [&]() -> std::string_view {
        if (score < 0) return "invalid";
        if (score < 60) return "retry";
        if (score <= 100) return "pass";
        return "invalid";
    }();
    std::cout << label << '\n';
}
```

This handwritten C++ produces the same result with straightforward conditions. Carven's value here is expressing intervals directly and checking that they cover the integer input. A C++ if chain does not provide the same interval coverage check.

Bounds can also be runtime values; then a `_` fallback is usually needed. See the [control-flow Reference](/reference/control/) for bound evaluation and dynamic-pattern coverage rules.

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

## Evaluate only the selected path

`&&` skips its right operand when the left is false; `||` skips it when the left is true. Only the chosen branch runs, but all source branches undergo semantic checks. Placing invalid code inside `if false` does not make it valid.

Use a statement-form if, as in the loop above, for break or continue. Value-producing branches have additional control-transfer rules described in the [control-flow Reference](/reference/control/).

## Exercise

Compare `1..1` with `1..=1`: expect 0 and 1. Then use `1..6` and skip 3; expect 12, and reproduce it with while. Finally, try scores -1, 59, 60, 100, and 101 to check each classification boundary.
