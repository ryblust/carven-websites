---
title: "Functions and return values"
description: "Name computations, use contextual parameter types, and make return paths explicit."
section: learn
lesson: 2
source: docs/semantics.md
---

## Give a computation a name

```carven
fn line_total(price: i32, quantity: i32) -> i32 {
    return price * quantity;
}

fn discount(total: i32) => total - 3;

fn main() {
    println(discount(line_total(12, 3)));
}
```

The output is `33`. Ordinary parameter types are mandatory. discount infers an i32 result from its expression. `=> expression;` returns a single expression and works well for short calculations.

## Return explicitly from a block

The last expression in an ordinary function block does not return automatically. Every normal path through a value-returning function needs return:

```carven
fn delivery(total: i32) -> i32 {
    if total >= 100 {
        return 0;
    }

    return 8;
}

fn main() {
    println(delivery(36));
}
```

The output is `8`. An explicit result type supplies context to literals in each return. Without a result annotation, each return is inferred independently and the results must agree. The first return does not choose a numeric type for later ones.

## void and side effects

A function without a return operand infers void. It may print or update Write parameters, but its nonexistent result cannot be bound to a local value. `return action();` can forward void. If the call can fail, it still needs `?`.

## Declaration order and recursion

A function may call another defined later. Mutual recursion involving inferred results can form a dependency cycle; an explicit `-> T` can break it. Failure-set inference and result-type inference are separate facts.

Calls select the function first, then evaluate arguments from left to right. Ordinary Read does not mean every type is copied: reads of String and arrays retain storage relationships, explored in the ownership chapter.

## Exercise

Add `grand_total(price, quantity)` using line_total and delivery. Inputs 12 and 3 should give 44; 50 and 2 should give 100. Start with an explicit return, then write an equivalent expression body.
