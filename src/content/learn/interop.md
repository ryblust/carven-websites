---
title: "Call C++ and export an interface"
description: "Move from `printf` to declared function contracts, with explicit native types, exceptions, and build responsibilities."
section: learn
lesson: 15
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

`carven run hello.cv` prints Hello from C++ twice: once through `printf`, once through `println`. The imported header is included in the generated C++; `using` makes the selected name available to Carven lookup. A c literal is a trailing-NUL native `const char*`, not `str`. Interior NUL is rejected. `println` and default interpolation display a C string's bytes as text, not its address.

You may also use `::std::printf` for an explicit global C++ path. Carven does not read header contents. The C++ compiler checks function existence, overloads, and argument validity. `carven interpret` accepts files with header imports, but it stops with `CV-INTERPRET-ADMISSION` when execution reaches a native call such as `printf`; run native code with `carven run`.

## Construct and use C++ types

```carven
import <vector> using std::vector;

var values = vector { 1, 2, 3 };
values.push_back(4);
let count: usize = values.size();
println(count, values[3]);
```

The output is `4 4`. C++ performs the braced construction, including class template argument deduction; `vector<i32> { 1, 2, 3 }` states the element type explicitly. C++ decides construction, methods, and conversion validity; the `usize` annotation requests destination construction. Native indexing follows provider rules and does not automatically gain Carven array bounds checks.

## Choose between standard APIs and C++ libraries

For growable Carven data use `Vector<T>` from the data chapter. For JSON use the owning `std::json` API; neither requires a third-party C++ dependency:

```carven run
import std::json using { JSONValue, JSONError, JSONValueError }

fn configure(text: str) -> String throw JSONError + JSONValueError {
    var config = JSONValue::parse(text)?;
    if !config.has("port")? => config.set("port", &&JSONValue::integer(8080))?;
    return config.to_json()?;
}

println(configure(r#"{"enabled":true}"#)?);
```

The output is `{"enabled":true,"port":8080}`. See the [JSON reference](/reference/json/) for value operations, or the [input project](/learn/data-pipeline/) to process incoming records.

Use header imports when a dependency supplies a native capability or an existing C++ type that your application needs. Header import does not install a library or configure linking. Keep include paths, versions, flags, and linked libraries in the native build. External exceptions must be converted at a provider boundary if callers need typed recovery.

## Declare a native function contract

This example imports a private native provider and exposes one Carven wrapper as a C++-callable entry:

```carven
import <cstdint>;

#[cpp] ---
std::int32_t native_double(std::int32_t value) {
    return value * 2;
}
---

private import(cpp) fn native_double(value: i32) -> i32 = ::native_double;

export(cpp) fn doubled(value: i32) -> i32 => native_double(value);

println(doubled(21));
```

The output is 42. The cpp fragment enters the implementation unchanged. The explicit `= ::native_double` target binds the source contract to that global C++ function. Without an explicit target, an import instead declares `invoke` in its generated provider namespace.

`export(cpp)` puts only the chosen `doubled` entry in the module's generated C++ API; the provider binding stays private. Its Carven visibility remains within the same Craft. C++ consumers include `carven/api/<module-name>.hpp` and call through the module namespace under `carven::api`. A wrapper used only within the Carven project can use an ordinary `fn` declaration.

The next example exposes a Carven function to C++ callers, with a writable parameter and a declared failure. That boundary uses `export(cpp)`. A signature type needs no ordinary `export` merely to appear in the generated C++ API.

## Export mutation and a failure contract

Save this separate example as labels.cv:

```carven
struct EmptyLabel {}

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
carven interpret --tests labels.cv
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

Compile the caller together with generated/labels.cpp. This example uses header-only runtime support, so no other generated standard-library implementation is needed:

```sh
clang++ -std=c++20 -Igenerated -I/path/to/carven/crafts \
    consumer.cpp generated/labels.cpp -o consumer
./consumer
```

Replace `/path/to/carven/crafts` with the installed Crafts directory, which supplies the runtime headers. The program prints `after`: the first call succeeded, and the rejected call left the text unchanged. `success_if()` returns a pointer for success and null for failure; EmptyLabel is this function's only declared failure. An unexpected outcome returns a nonzero exit status.

The caller handles success or EmptyLabel. This is an explicit result contract; C++ exceptions do not become it automatically. See [interop reference](/reference/interop/) for representations and lifetime obligations.

## Exceptions and borrows

Carven try does not catch C++ exceptions. Convert them in a native adapter when callers need typed recovery, as the next example shows.

Callers and providers must keep pointers returned or retained by C++ valid. See the [interop reference](/reference/interop/) for lifetime responsibilities.

## Convert native exceptions into a declared failure

A native adapter can catch exceptions and return the declared failure instead. Save `port.cv`:

```carven
import <cstdint>;
import <stdexcept>;
import <string>;
import <string_view>;

struct InvalidPort {}

#[cpp] ---
#include <carven/runtime/value/outcome.hpp>

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

import(cpp) fn parse_port_native(text: str, invalid: InvalidPort) -> i32 throw InvalidPort = ::parse_port_native;

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

`carven run port.cv` prints:

```text
Port: 8080
Invalid port: http
Invalid port: 99999999999999999999
Invalid port: 80suffix
```

In `parse_port_native(text, {})`, the parameter type supplies the type for `{}`, so the call passes an empty `InvalidPort`. The C++ template deduces the generated failure type from that argument, without spelling a compiler-private namespace. The adapter decides which exceptions become `InvalidPort`; an exception it does not catch, such as allocation failure, still terminates at the noexcept boundary. Carven's `?` and catch then work with the declared contract.

## Exercise

Return to the `native_double` example. Change its body to return value + 2 and run it again; expect `23`. Then remove the cpp provider while keeping import(cpp), and inspect the native declaration/link failure. Native compilation and linking check whether the provider exists.
