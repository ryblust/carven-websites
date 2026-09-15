---
title: "Calling C++ and exporting interfaces"
description: "Move from printf to scalar façades, with explicit native types, exceptions, and build responsibilities."
section: learn
lesson: 13
source: docs/semantics.md
---

## Your first native call

```carven
import <cstdio> using std::printf;

fn main() {
    printf(c"Hello from C++\n");
}
```

Native execution prints Hello from C++. The header import supplies C++ declarations; using makes the name available for lookup. A c literal is a trailing-NUL native const char*, not str. Interior NUL is rejected.

You may also use `::std::printf` for an explicit global C++ path. Carven does not read header contents. The C++ compiler checks function existence, overloads, and argument validity.

## Native types

```carven
import <vector> using std::vector;

fn main() {
    var values = vector<i32> { 1, 2, 3 };
    values.push_back(4);
    let count: usize = values.size();
    println(count);
}
```

The output is 4. Native template arguments may be types. C++ decides construction, methods, and conversion validity; the usize annotation requests destination construction. Native indexing follows provider rules and does not automatically gain Carven array bounds checks.

## An explicit scalar interface

```carven
import <cstdint>;

#[cpp] ---
std::int32_t native_double(std::int32_t value) {
    return value * 2;
}
---

private import(cpp) fn native_double(value: i32) -> i32;

export(cpp) fn doubled(value: i32) -> i32 => native_double(value);

fn main() {
    println(doubled(21));
}
```

The output is 42. The cpp fragment enters the implementation unchanged. import(cpp) calls a global provider of the same name, and export(cpp) puts the wrapper in the module's generated API. C++ consumers include `carven/api/<module-name>.hpp` and use the module namespace under `carven::api`.

This explicit boundary accepts only by-value Read builtin scalar parameters and scalar/void results. It does not support String, arrays, structs, pointers, Write/Take, or typed failures. Broader direct header operations follow their native contracts.

## Exceptions and borrows

Generated functions have noexcept boundaries: an escaping C++ exception terminates. Carven try does not catch native exceptions. For recovery, catch inside a native adapter first and return a result through the selected interface.

Carven tracks known storage and text backing. It does not prove the lifetime of arbitrary C++ returned pointers or infer whether a native function retains arguments long-term. Callers and providers must satisfy those contracts.

## Exercise

Change native_double to return value + 2 and confirm the output changes. Then remove the cpp provider while keeping import(cpp), and inspect the native declaration/link failure. A Carven import is not proof that the provider exists.
