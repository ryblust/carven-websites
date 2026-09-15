---
title: "Pointers and external addresses"
description: "Nullable addresses, target access, non-null proofs, and native resource responsibilities."
section: reference
lesson: 14
source: docs/semantics.md
---

## Address values and target access

`ptr<T>` stores an address granting Read access; `ptr<&T>` grants Write access. Both are nullable, copyable, and non-owning. let/var controls reassignment of the address slot; the pointer type controls target access. An immutable `let p: ptr<&T>` may mutate its target.

Targets may be Carven types, C++ types, or nested pointers. A pointer does not contain its target by value and permits recursive structures. ptr<void> may be stored and passed but not dereferenced. C++ checks native alias validity.

`*p` selects a target location; `p->field` means `(*p).field`. The address must be available and locally proven non-null in the current callable. `let x = *p` performs ordinary owning initialization, with native copyability checked by C++. `&*p` can pass a Write target. `&&*p` is invalid because the target is not a Takeable Carven owner.

## Conversions and arguments

For the same target type, `ptr<&T>` may narrow to `ptr<T>` in value contexts, including initialization, assignment, fields/elements, Read arguments, const, and returns. The reverse is invalid. There is no general covariance through arrays, aggregates, nested targets, or function types. Copying an inner pointer preserves its inner permissions.

A Read pointer argument saves an address snapshot. Write aliases an address slot and requires an identical full type. Take also requires an exact type; it transfers the address value and makes its source owner unavailable, without clearing copies or releasing the target.

nullptr requires concrete pointer context and has no independent null type. Pointers can compare with nullptr or same-target-type pointers using ==/!=. There is no truthiness, ordering, arithmetic, direct indexing, integer conversion, or Carven address-of. &p passes Write access to the slot, not an automatically produced T**.

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

Native projections, dynamic indices, and memory reached through pointers have no cross-expression facts. Save an address in a local handle and check it. Unproven dereference produces `CV-PTR-NONNULL`, rather than inserting a runtime trap. Passing a nullable address to an API does not require a dereference proof.

## Native representation and responsibilities

Read/Write targets map to const T* and T*, composed at each pointer layer. Read passes addresses by value; Write uses the corresponding pointer reference. Generated code selects the dereference address before later operations can change its slot.

Storing or passing a pointer usually requires only a target declaration and can use incomplete native types. Forming the target's C++ type expression must still meet its completeness requirements; callable parameter representation, for example, may require complete T.

Pointer copying, argument passing, and Take perform no allocation, reference counting, or release. Non-null does not prove liveness. Resource owners and C++ adapters manage allocation, release, T** output protocols, buffer traversal, and validity periods. Pointers are outside scalar import(cpp)/export(cpp).
