---
title: "Pointers and external addresses"
description: "Nullable addresses, addressof, target access, non-null proofs, liveness checks, and native resource responsibilities."
section: reference
lesson: 16
source: docs/semantics.md
---

## Address values and target access

`ptr<T>` stores an address granting Read access; `ptr<&T>` grants Write access. Both are nullable, copyable, and non-owning. let/var controls reassignment of the address slot; the pointer type controls target access. An immutable `let p: ptr<&T>` may mutate its target.

Targets may be Carven types, C++ types, or nested pointers. A pointer does not contain its target by value and permits recursive structures. ptr<void> may be stored and passed but not dereferenced. C++ checks native alias validity.

`*p` selects a target location; `p->field` means `(*p).field`. The address must be available and locally proven non-null in the current callable. `let x = *p` performs ordinary owning initialization, with native copyability checked by C++. `&*p` can pass a Write target. `&&*p` is invalid because the target is not a Takeable Carven owner.

## Taking addresses with `addressof`

`addressof(place)` produces `ptr<T>` for an addressable place with Read access; `addressof(&place)` produces `ptr<&T>` and requires that the place permits Write. The place may be a local, parameter, field, or element, and it is evaluated once. The result is non-null at its creation, so a dereference directly through it needs no separate check.

```carven
fn bump(target: ptr<&i32>) {
    if target != nullptr {
        *target += 1;
    }
}

var count = 1;
let reader = addressof(count);
let writer = addressof(&count);
bump(writer);
*writer += 10;
println(*reader, count); // 12 12
```

| Operand                              | Diagnostic                 |
| ------------------------------------ | -------------------------- |
| Temporary, such as `addressof(1)`    | `CV-ACCESS-NOT-ASSIGNABLE` |
| Compile-time constant name           | `CV-ACCESS-NOT-ASSIGNABLE` |
| `addressof(&value)` on a `let` owner | `CV-ACCESS-IMMUTABLE`      |
| `addressof(&&value)`                 | `CV-ACCESS-CALL-MISMATCH`  |

`addressof` is a builtin callable found by ordinary name lookup, so a local declaration may shadow it. Assigning a new value to a live owner preserves its address. Take ends the owner's identity; reassigning it afterwards does not revive earlier pointers. An address obtained from a Read array parameter may refer to the caller's storage; if the caller passed a temporary array, that storage ends with the containing full expression.

## Conversions and arguments

For the same target type, `ptr<&T>` may narrow to `ptr<T>` in value contexts, including initialization, assignment, fields/elements, Read arguments, const, and returns. The reverse is invalid. There is no general covariance through arrays, aggregates, nested targets, or function types. Copying an inner pointer preserves its inner permissions.

A Read pointer argument saves an address snapshot. Write aliases an address slot and requires an identical full type. Take also requires an exact type; it transfers the address value and makes its source owner unavailable, without clearing copies or releasing the target.

nullptr requires concrete pointer context and has no independent null type. Pointers can compare with nullptr or same-target-type pointers using ==/!=. There is no truthiness, ordering, arithmetic, direct indexing, or integer conversion; `addressof` is the only Carven address-of operation. &p passes Write access to the slot, not an automatically produced T**.

Arrays or branch results mixing permissions need annotations when no context exists. An adjacent type may type nullptr but does not authorize permission narrowing inside nested arrays or branches.

## Local non-null proofs

```carven
fn read(pointer: ptr<i32>) -> i32 {
    if pointer == nullptr {
        return 0;
    }

    return *pointer;
}
```

Each function and closure independently tracks null, nonnull, and unknown for local names, fixed Carven field paths, and constant array indices. nullptr comparison, negation, short-circuiting, and early return refine branches; merging retains only shared facts. Bool helpers, API success codes, and check/require are not proofs.

Copying and permission narrowing carry the current fact to a new slot without establishing ongoing equality. Assignment replaces facts; Take removes source facts. Write calls clear overlapping facts. A slot previously passed to Write may have escaped, so subsequent calls clear facts for those slots, Write parameters, and Write captures. Loops clear possibly written facts before entering conditions and bodies; they do not solve relationships across iterations.

Native projections, dynamic indices, and memory reached through pointers have no cross-expression facts. Save an address in a local handle and check it. Unproven dereference produces `CV-PTR-NONNULL`, rather than inserting a runtime trap. Passing a nullable address to an API does not require a dereference proof. A fresh `addressof` result counts as non-null.

## Native representation and responsibilities

Read/Write targets map to const T* and T*, composed at each pointer layer. Read passes addresses by value; Write uses the corresponding pointer reference. Generated code selects the dereference address before later operations can change its slot.

Storing or passing a pointer usually requires only a target declaration and can use incomplete native types. Forming a native target's C++ type expression must still meet its own completeness requirements. A pure Carven callable signature inside a pointer does not impose that requirement on its parameter types: `struct Node { callback: ptr<fn(Node) -> void> }` is valid, including through a generated C++ interface.

Pointer copying, argument passing, and Take perform no allocation, reference counting, or release. Non-null does not prove liveness; see [liveness checks](#liveness-checks). Resource owners and C++ adapters manage allocation, release, T** output protocols, buffer traversal, and validity periods. Pointers may cross declared import(cpp)/export(cpp) contracts; native providers and callers remain responsible for target lifetime.

## Liveness checks

Non-null never proves that a target is alive, and ordinary runtime pointer operations add no general borrow or liveness checker. External addresses keep their provider's lifetime contract.

Required compile-time execution is stricter: the evaluator tracks each local object across calls and scopes, and dereferencing a pointer whose target has left its scope or been Taken reports `CV-CONST-EVALUATION`, even if that storage was assigned again. The same applies to byte addresses whose text backing has expired.

```carven
const fn escaped() -> ptr<i32> {
    var value = 1;
    return addressof(value);
}

const test "dangling address" {
    let address = escaped();
    if address != nullptr {
        check(*address == 1);
    }
}
```

`carven check` rejects this test at `*address`. Local pointers may be created, passed through Read and Write parameters, and dereferenced while their targets live during compile-time execution, but a non-null local pointer cannot become a published constant value.
