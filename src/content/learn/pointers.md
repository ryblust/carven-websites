---
title: "Use native addresses and non-null checks"
description: "Take addresses with addressof, store native addresses, establish local non-null facts, and keep resource owners alive."
section: learn
lesson: 14
source: docs/semantics.md
---

## Take the address of a place

`addressof(place)` produces a read-only `ptr<T>`; `addressof(&place)` produces a writable `ptr<&T>`. Save this as `address.cv`:

```carven
fn restock(target: ptr<&i32>, amount: i32) {
    if target != nullptr {
        *target += amount;
    }
}

fn level(source: ptr<i32>) -> i32 {
    if source == nullptr {
        return 0;
    }
    return *source;
}

var stock = 7;
restock(addressof(&stock), 2);
println(stock, level(addressof(stock)));
```

Run `./xmakew run carven address.cv`. The output is `9 9`. The `&` inside `addressof(&stock)` requests Write access, just like a Write argument, so stock must be a var; with `let stock` it reports `CV-ACCESS-IMMUTABLE`. The place must be a named binding, field, or element: a temporary such as `addressof(1 + 2)` is rejected, and there is no `addressof(&&stock)`.

A new address is non-null, so `*addressof(stock)` needs no check where it is created. The helpers receive ordinary pointer parameters that callers could set to nullptr, so each helper checks before dereferencing.

## Addresses come from native boundaries

Addresses of native objects come from native code. Obtain one from a native adapter and store it in ptr:

```carven
import <cstdint>;

#[cpp] ---
std::int32_t* counter_address() noexcept {
    static std::int32_t value = 7;
    return &value;
}
---

let pointer: ptr<&i32> = ::counter_address();

if pointer != nullptr {
    *pointer += 1;
    println(*pointer);
}
```

This standalone program prints 8. The native static object supplies the target lifetime. `ptr<&i32>` permits writes to the target. The pointer owner is let, so it cannot be rebound, but that does not revoke target Write access.

## Non-null proofs are local

Before dereferencing, establish a non-null fact directly in the current function. Direct nullptr comparisons and early return can establish it. A bool-returning helper, native success code, or require does not supply the same proof. Each closure needs its own proof too. Without a proof, the dereference reports `CV-PTR-NONNULL`.

A Write call may change an address slot and clears related facts. Save a pointer obtained through a dynamic index or native member in a local handle, then check that handle, so the proof is tied to one evaluation result.

## Pointers do not own targets

Copying ptr copies an address. Taking ptr makes its source address owner unavailable. Neither operation releases the target, and other copies do not automatically become null. Non-null describes an address condition, not a live target.

addressof does not extend its target's life either. Carven does not reject a function that returns `addressof(local)`, but the address dangles once the function returns. After Take, do not use earlier addresses of that owner, even if it is later assigned again. Native targets need an external ownership protocol: do not dereference after native release. ptr<void> can be stored and passed, but not dereferenced. Pointers have no arithmetic, direct indexing, truthiness, or integer conversion. See the [pointer Reference](/reference/pointers/) for the full rules.

## Exercise

In address.cv, remove the nullptr check from level and expect `CV-PTR-NONNULL`. Change `var stock` to `let stock` and expect `CV-ACCESS-IMMUTABLE` at `addressof(&stock)`. In the native program, change the target type to ptr<i32>: the read still works, but the write reports an access error.
