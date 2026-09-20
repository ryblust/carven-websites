---
title: "Call C++ and export an interface"
description: "Move from printf to declared function contracts, with explicit native types, exceptions, and build responsibilities."
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

## Use a third-party library

The same import mechanism works with [nlohmann/json](https://json.nlohmann.me/integration/). Save this as config.cv:

```carven
import <nlohmann/json.hpp> using nlohmann::json::parse;

fn main() {
    let config = parse(c"{\"port\":9000}");
    let port: i32 = config.value(c"port", 8080);
    println(f"Port: {port}");
}
```

parse creates the library's native JSON object. Its value method reads port, using 8080 if the key is missing. The i32 annotation gives the native result a Carven destination type; println then uses that value normally. No binding code is needed for these calls.

For a self-contained local trial, put the single header beside config.cv under nlohmann/. These commands pin the version used to verify the example:

```sh
mkdir -p nlohmann
curl --fail --location https://raw.githubusercontent.com/nlohmann/json/v3.12.0/single_include/nlohmann/json.hpp -o nlohmann/json.hpp
carven config.cv
```

Expect `Port: 9000`. Change the JSON text to `{}` and run again: the output becomes `Port: 8080`. In an existing project, keep managing the dependency through its native build and include paths. Header import does not download the library.

[value's default](https://json.nlohmann.me/api/basic_json/value/) handles a missing key, not malformed JSON or the wrong value type. This example assumes a valid object and an in-range integer port. Parsing or type errors can throw native exceptions; see the exception boundary below before using untrusted input.

## Declare a native function contract

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

This first example uses an integer contract. The same boundary supports ordinary Carven types, Write/Take access, and declared failures; the provider must satisfy the generated C++ contract. Start with a small exported function before adding native providers for more complex types.

## Export mutation and a failure contract

Save this separate example as labels.cv:

```carven
export struct EmptyLabel {}

export(cpp) fn rename(&label: String, next: str) throw EmptyLabel {
    if next.is_empty() {
        throw EmptyLabel {};
    }
    label = String::from_str(next);
}
```

First append these two tests to the same file to check a successful update and rejection of empty text:

```carven
test "rename a label" {
    var label: String = "before";
    try {
        rename(&label, "after")?;
    } catch {
        EmptyLabel(_) => fail("nonempty label was rejected"),
    }
    check(label == "after");
}

test "reject an empty label" {
    var label: String = "before";
    let rejected = try {
        rename(&label, "")?;
        false
    } catch {
        EmptyLabel(_) => true,
    };
    check(rejected);
    check(label == "before");
}
```

```sh
carven --tests labels.cv
carven compile -o generated labels.cv
```

Both tests should pass: success changes the text to after, while failure leaves it as before. The Write parameter requires native test mode. Open `generated/carven/api/labels.hpp` to inspect the generated interface. The Write parameter becomes a mutable reference, the declared failure becomes a `carven::runtime::Outcome`, and the header includes the necessary type definitions. A C++ consumer includes this API and matching runtime headers, then compiles and links generated implementations.

The caller handles success or EmptyLabel. This is an explicit result contract; C++ exceptions do not become it automatically. See [interop Reference](/reference/interop/) for representations and lifetime obligations.

## Exceptions and borrows

Generated functions have noexcept boundaries: an escaping C++ exception terminates. Carven try does not catch native exceptions. For recovery, catch inside a native adapter first and return a result through the selected interface.

Carven tracks known storage and text backing. It does not prove the lifetime of arbitrary C++ returned pointers or infer whether a native function retains arguments long-term. Callers and providers must satisfy those contracts.

## Exercise

Change native_double to return value + 2 and confirm the output changes. Then remove the cpp provider while keeping import(cpp), and inspect the native declaration/link failure. Native compilation and linking check whether the provider exists.
