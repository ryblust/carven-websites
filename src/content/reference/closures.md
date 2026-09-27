---
title: "Closures, captures, and callable views"
description: "Closure identity, value and Write captures, view adaptation, and call snapshots."
section: reference
lesson: 9
source: docs/semantics.md
---

## Creation and capture

A lambda must have a capture list; use [] when empty. Its body is a block or `=> expression`, as in `[factor](item: i32) => item * factor`; an expression body implicitly returns under the same rules as named functions. Creating a closure does not run its body. Captures are established in list order, with each name appearing once. Only runtime bindings visible at creation may be captured. Module declarations and compile-time constants are not explicitly captured.

| Form        | Captured content                   | Body access   |
| ----------- | ---------------------------------- | ------------- |
| `[value]`   | Owning copy of the immediate value | Read          |
| `[&value]`  | Alias of writable source storage   | Write         |
| `[&&value]` | Unsupported                        | Compile error |

Value captures cannot be assigned or Taken. Write capture bindings cannot be Taken either. Each nested lambda has its own capture boundary. An unused explicit capture produces `CV-LAMBDA-CAPTURE-UNUSED`. Creation does not contribute the body’s failures; actual calls use its failure contract.

## Closure identity and copying

Each lambda source expression has a unique concrete type that cannot be spelled by hand. Repeated execution of one expression produces values of that type; two identical-looking lambda expressions have different types.

Same-type closure assignment copies value captures and rebinds Write captures to the source closure's referents rather than assigning to the referents themselves. `let copy = closure` owns independent captured values; Write captures still alias original storage. Capturing a closure containing Write captures by value still permits mutation of those original referents.

An immutable closure owner can invoke stored Write permissions. Taking the whole closure makes the source owner unavailable and preserves Write relationships in the destination. Copies, aggregates, and returns never extend referent lifetimes. A returned closure referring to a caller's Write parameter may satisfy the relationship; one referring to a callee-local owner cannot.

## Signature context

An expected callable view may supply omitted lambda parameter types. Without context, parameter types are mandatory. An explicit result annotation takes priority, followed by the expected view's result, then independent inference of consistent return types. The body is checked before the closure type is completed. An expression body may itself produce a lambda, as `factory` does below.

```carven
fn apply(callback: fn(i32) -> i32, value: i32) -> i32 => callback(value);

let offset = 2;
let factor = 3;
let scale = [factor](item: i32) => item * factor;
let factory = [](value: i32) => [value](_: i32) => value;
let seven = factory(7);
println(apply([offset](value) => value + offset, 40), scale(4), seven(0)); // 42 12 7
```

## Non-owning callable views

`fn(...) -> R throw E + F` is a non-owning view. Parameter access, parameter types, and success results must match exactly; the source failure set may be a subset of the destination's. Array adaptation applies recursively to elements, including zero-length arrays. Callable failure contracts nested inside parameter or success-result types must still be equal.

Views can be parameters, locals, and local array elements. They cannot be stored in structs or enums, returned, or captured by lambdas. These restrictions recurse through arrays.

A capturing lambda temporary can form a view only as a direct argument, lasting until that call ends. A named capturing closure may form a local view when its owner's scope is sufficient. This borrows the closure object without copying captures. While the borrow is active, the owner cannot be Taken. Once every borrower leaves an inner scope, a still-live owner may be Taken again. A noncapturing closure forms a view without borrowing closure storage, though its creation expression still evaluates once. Assigning a capturing target through a Write view parameter is rejected because that parameter does not establish a sufficient backing lifetime.

## Same-type copying and failure widening

A same-type view copy saves the current target description and preserves its backing requirements. Widening an existing view's failure set borrows the source view's storage. Rebinding that source makes the wide view observe the new target. Elementwise array widening behaves the same way. The source view must live long enough, and a Taken view cannot supply this borrow.

```carven
struct E {}
struct F {}

fn first(x: i32) -> i32 throw E => x + 1;

fn second(x: i32) -> i32 throw E => x + 2;

fn example() throw E + F {
    var source: fn(i32) -> i32 throw E = first;
    let copied = source;
    let widened: fn(i32) -> i32 throw E + F = source;

    source = second;

    println(copied(5)?, widened(5)?); // 6 7
}
```

The wide view invokes the source view and adapts its result. It neither owns that source view nor extends capture storage lifetime. Directly adapting a concrete callable to a wide view uses that callable as the target.

## Snapshots at calls

A concrete closure call selects the object before evaluating arguments. Reassigning that same closure object during argument evaluation affects this call's captures. A view call first saves its target description. Rebinding the current view variable affects later calls; mutating the already selected closure object still affects this call.

A wide view targets the source view object, so rebinding that source during argument evaluation affects the current wide-view call too. For an independent capture snapshot, make an owning copy of the concrete closure first. Copying a view saves only its target description.

## Known function targets

An immutable local initialized from a named function keeps that function as its known target through copies and view adaptation. A call through it uses the function's own failure contract, including an explicit `throw` clause, so a wider view type adds no failures to that call:

```carven
struct E {}

fn exact(value: i32) -> i32 => value + 1;

let step = exact;
let wide: fn(i32) -> i32 throw E = step;
println(step(1), wide(2)); // 2 3
```

Neither call needs `?`. Calls through parameters, `var` views, or targets that cannot be resolved use the view's contract: with `var step: fn(i32) -> i32 throw E = exact;`, `step(1)` requires `?` and otherwise reports `CV-EFFECT-UNMARKED`.
