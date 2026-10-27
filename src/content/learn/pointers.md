---
title: "Use native pointers"
description: "Get an address, check it before use, and keep the pointed-to data alive."
section: learn
lesson: 16
source: docs/language/pointers.md
---

## Take the address of a place

A native API may work with the address of an existing object rather than a value copy. A pointer stores that address. Before using one, you need to know whether it is null, whether writing is allowed, and who keeps the object alive.

`addressof(place)` produces a read-only `ptr<T>`; `addressof(&place)` produces a writable `ptr<&T>`. Compare a pointer with `nullptr` to check for null; `*pointer` accesses the object it points to. Save this as `address.cv`:

```carven run
fn restock(target: ptr<&i32>, amount: i32) {
    if target != nullptr => *target += amount;
}

fn level(source: ptr<i32>) -> i32 {
    if source == nullptr => return 0;
    return *source;
}

var stock = 7;
restock(addressof(&stock), 2);
restock(nullptr, 2);
println(stock, level(addressof(stock)), level(nullptr));
```

Run `carven run address.cv`. The output is `9 9 0`. The null restock does nothing, and level returns zero for a null address. The `&` inside `addressof(&stock)` requests Write access, just like a Write argument, so stock must be a `var`; with `let stock` it reports `CV-ACCESS-IMMUTABLE`. The place must be a named binding, field, or element: a temporary such as `addressof(1 + 2)` is rejected, and there is no `addressof(&&stock)`.

A new address is non-null, so `*addressof(stock)` needs no check where it is created. The helpers receive ordinary pointer parameters that callers could set to `nullptr`, so each helper checks before dereferencing.

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

This standalone program prints 8. The native static object supplies the target lifetime. `ptr<&i32>` permits writes to the target. The pointer owner is `let`, so it cannot be rebound, but that does not revoke target Write access.

## Non-null proofs are local

Before dereferencing, establish a non-null fact in the current function with a direct `nullptr` comparison or early return. Without it, dereferencing reports `CV-PTR-NONNULL`. See the [pointer reference](/reference/pointers/) for accepted checks and how they propagate through branches.

A Write call may change an address slot and clears related facts. Save a pointer obtained through a dynamic index or native member in a local handle, then check that handle, so the proof is tied to one evaluation result.

## Pointers do not own targets

Copying ptr copies an address. Taking ptr makes its source address owner unavailable. Neither operation releases the target, and other copies do not automatically become null. Non-null describes an address condition, not a live target.

`addressof` does not extend its target's life. Carven does not reject a function that returns `addressof(local)`, but that address dangles after the function returns. After Take, do not use earlier addresses of that owner, even if it is assigned again. Do not dereference a native target after its release. Other pointer operations are listed in the [pointer reference](/reference/pointers/).

## Exercise

In address.cv, remove the `nullptr` check from level and expect `CV-PTR-NONNULL`. Change `var stock` to `let stock` and expect `CV-ACCESS-IMMUTABLE` at `addressof(&stock)`. In the native program, change the target type to `ptr<i32>`: the read still works, but the write reports an access error.
