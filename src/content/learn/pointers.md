---
title: "Use native addresses and non-null checks"
description: "Store native addresses, establish local non-null facts, and keep resource owners alive."
section: learn
lesson: 14
source: docs/semantics.md
---

## Addresses come from native boundaries

Carven has no general address-of operator. Obtain an address from a native adapter and store it in ptr:

```carven
import <cstdint>;

#[cpp] ---
std::int32_t* counter_address() noexcept {
    static std::int32_t value = 7;
    return &value;
}
---

fn main() {
    let pointer: ptr<&i32> = ::counter_address();

    if pointer != nullptr {
        *pointer += 1;
        println(*pointer);
    }
}
```

This standalone program prints 8. The native static object supplies the target lifetime. `ptr<&i32>` permits writes to the target. The pointer owner is let, so it cannot be rebound, but that does not revoke target Write access.

## Non-null proofs are local

Before dereferencing, establish a non-null fact directly in the current function. Direct nullptr comparisons and early return can establish it. A bool-returning helper, native success code, or require does not supply the same proof. Each closure needs its own proof too.

A Write call may change an address slot and clears related facts. Save a pointer obtained through a dynamic index or native member in a local handle, then check that handle, so the proof is tied to one evaluation result.

## Pointers do not own targets

Copying ptr copies an address. Taking ptr makes its source address owner unavailable. Neither operation releases the target, and other copies do not automatically become null. Non-null describes an address condition, not a live target.

Target resources need an external ownership protocol. Do not return an address of a native local object or dereference after native release. ptr<void> can be stored and passed, but not dereferenced. Pointers have no arithmetic, direct indexing, truthiness, or integer conversion.

## Exercise

Change the target type to ptr<i32>, keep the read, and remove the write. Keeping the write should produce an access error. Remove the nullptr check and confirm that a local non-null proof is required.
