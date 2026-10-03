---
title: "Call C++ and export an interface"
description: "Move from `printf` to declared function contracts, with explicit native types, exceptions, and build responsibilities."
section: learn
lesson: 13
source: docs/language/interop.md
---

## Your first native call

Save this as hello.cv:

```carven
import <cstdio> using std::printf;

let greeting = c"Hello from C++";
printf(c"%s\n", greeting);
println(greeting);
```

`carven hello.cv` prints Hello from C++ twice: once through `printf`, once through `println`. The header import supplies C++ declarations; using makes the name available for lookup. A c literal is a trailing-NUL native `const char*`, not `str`. Interior NUL is rejected. `println` and default interpolation display a C string's bytes as text, not its address.

You may also use `::std::printf` for an explicit global C++ path. Carven does not read header contents. The C++ compiler checks function existence, overloads, and argument validity. `carven interpret` accepts files with header imports, but it stops with `CV-INTERPRET-ADMISSION` when execution reaches a native call such as `printf`; run native code with `carven`.

## Native types

```carven
import <vector> using std::vector;

var values = vector { 1, 2, 3 };
values.push_back(4);
let count: usize = values.size();
println(count, values[3]);
```

The output is `4 4`. C++ performs the braced construction, including class template argument deduction; `vector<i32> { 1, 2, 3 }` states the element type explicitly. C++ decides construction, methods, and conversion validity; the `usize` annotation requests destination construction. Native indexing follows provider rules and does not automatically gain Carven array bounds checks.

## Use a third-party library

The same import mechanism works with [nlohmann/json](https://json.nlohmann.me/integration/). Save this as config.cv:

```carven
import <nlohmann/json.hpp> using nlohmann::json::parse;

let config = parse(c"{\"port\":9000}");
let port: i32 = config.value(c"port", 8080);
println(f"Port: {port}");
```

parse creates the library's native JSON object. Its value method reads port, using 8080 if the key is missing. The `i32` annotation gives the native result a Carven destination type; `println` then uses that value normally. No binding code is needed for these calls.

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

println(doubled(21));
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
    label = next as String;
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

Both tests should pass: success changes the text to after, while failure leaves it as before. `carven interpret --tests labels.cv` runs the same tests without a C++ compiler. Open `generated/carven/api/labels.hpp` to inspect the generated interface. The Write parameter becomes a mutable reference, the declared failure becomes a `carven::runtime::Outcome`, and the header includes the necessary type definitions.

A C++ consumer includes this API. Save consumer.cpp beside labels.cv:

```cpp
#include <carven/api/labels.hpp>

#include <iostream>

int main() {
    auto label = carven::runtime::String::from_str("before");
    auto renamed = carven::api::labels::rename(label, "after");
    auto rejected = carven::api::labels::rename(label, "");
    if (!renamed.success_if() || rejected.success_if()) {
        return 1;
    }
    std::cout << label.as_str() << '\n';
}
```

Compile it with the generated implementations, including the bundled UTF and SIMD Craft sources that `compile` writes under `generated/crafts/`:

```sh
clang++ -std=c++20 -Igenerated -I/path/to/carven/crafts \
    consumer.cpp generated/labels.cpp generated/crafts/carven/std/utf/*.cpp \
    generated/crafts/carven/std/simd/*.cpp \
    -o consumer
./consumer
```

Replace `/path/to/carven/crafts` with the installed Crafts directory, which supplies the runtime headers. The program prints `after`: the first call succeeded, and the rejected call left the text unchanged. `success_if()` returns a pointer for success and null for failure; EmptyLabel is this function's only declared failure. An unexpected outcome returns a nonzero exit status.

The caller handles success or EmptyLabel. This is an explicit result contract; C++ exceptions do not become it automatically. See [interop Reference](/reference/interop/) for representations and lifetime obligations.

## Exceptions and borrows

Generated functions have noexcept boundaries: an escaping C++ exception terminates. Carven try does not catch native exceptions. For recovery, catch inside a native adapter first and return a result through the selected interface.

Carven tracks known storage and text backing. It does not prove the lifetime of arbitrary C++ returned pointers or infer whether a native function retains arguments long-term. Callers and providers must satisfy those contracts.

## Convert native exceptions into a declared failure

A native adapter can catch exceptions and return the declared failure instead. Save port.cv:

```carven
import <cstdint>;
import <string>;
import <string_view>;

struct InvalidPort {}

#[cpp] ---
#include <carven/runtime/outcome.hpp>

template<typename Failure>
auto parse_port_native(std::string_view text, const Failure& invalid) noexcept
    -> carven::runtime::Outcome<std::int32_t, Failure> {
    using Result = carven::runtime::Outcome<std::int32_t, Failure>;
    try {
        std::size_t used = 0;
        const int port = std::stoi(std::string{text}, &used);
        if (used != text.size() || port < 1 || port > 65535) {
            return Result::failure(invalid);
        }
        return Result::success_from([port]() noexcept -> std::int32_t { return port; });
    } catch (const std::invalid_argument&) {
        return Result::failure(invalid);
    } catch (const std::out_of_range&) {
        return Result::failure(invalid);
    }
}
---

import(cpp) fn parse_port_native(text: str, invalid: InvalidPort) -> i32 throw InvalidPort;

fn port(text: str) -> i32 throw InvalidPort => parse_port_native(text, {})?;

fn report(text: str) {
    try {
        println("Port:", port(text)?);
    } catch {
        InvalidPort(_) => println("Invalid port:", text),
    }
}

report("8080");
report("http");
report("99999999999999999999");
report("80suffix");
```

`carven port.cv` prints:

```text
Port: 8080
Invalid port: http
Invalid port: 99999999999999999999
Invalid port: 80suffix
```

In `parse_port_native(text, {})`, the parameter type supplies the type for `{}`, so the call passes an empty InvalidPort. The C++ template deduces the generated failure type from that argument, without spelling a compiler-private namespace. The adapter decides which exceptions become InvalidPort; an exception it does not catch, such as allocation failure, still terminates at the noexcept boundary. Carven's `?` and catch then work with the declared contract.

## Exercise

Change native_double to return value + 2 and confirm the output changes. Then remove the cpp provider while keeping import(cpp), and inspect the native declaration/link failure. Native compilation and linking check whether the provider exists.
