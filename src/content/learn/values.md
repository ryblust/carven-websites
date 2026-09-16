---
title: "Name and update values"
description: "Express data with let, var, const, and type annotations; understand literals and explicit conversions."
section: learn
lesson: 1
source: docs/semantics.md
---

## Store and update values

Save this as main.cv and run it using the native command from the first chapter:

```carven
fn main() {
    let unit_price = 12;
    var quantity = 2;
    quantity += 1;
    const tax_percent: i32 = 5;
    let subtotal = unit_price * quantity;
    println(subtotal, tax_percent);
}
```

The output is `36 5`. A let binding cannot be reassigned; var allows updates. A const initializer must complete at compile time. Using a constant denotes the selected constant value, without a runtime owner.

Every declaration needs an initializer. `let ignored = ...` still introduces a name. Use `let _ = ...` to discard deliberately; discarding does not skip evaluation or cleanup.

## Choose a type

Integers include i8 through i64, u8 through u64, and pointer-width isize/usize. Floating-point types are f32/f64; booleans use bool. Unsuffixed integers default to i32 and floating literals to f64. An annotation can provide literal context within the same numeric family.

```carven
fn main() {
    let count: u8 = 12;
    let total = count as i32;
    let fraction: f32 = 1.5;
    println(count, total, fraction);
}
```

Once a variable has a type, later uses do not change it. An existing u8 value does not automatically promote to i32; use as explicitly. Conditions require bool, so `if 1` is invalid. To test zero versus nonzero, write `value != 0` or explicitly convert to bool.

## Two stages of arithmetic

Runtime integer addition, subtraction, multiplication, and left shifts wrap at the type's width. Required constant evaluation checks overflow. Putting a provably overflowing literal operation in let does not bypass that check.

Integer casts reduce modulo the destination width; they are not range checks. If business rules require a value between 0 and 100, compare first and convert afterward. Dynamic division by zero and invalid shifts terminate execution; they are not catchable failures.

## Scope and shadowing

An inner scope may declare a name that shadows an outer one; a scope cannot declare the same name twice. A new name becomes available only after its initializer completes, so an inner `let value = value + 1;` can read the outer value. Ordinary functions do not implicitly capture caller or entry locals. Pass required values as parameters.

## Exercise

Change quantity to let in the first program and inspect the assignment diagnostic, then restore var. If you move tax_percent to an export module constant, retain its annotation: export const requires an explicit type.
