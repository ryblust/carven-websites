---
title: "Do known work ahead of time"
description: "Build constants with ordinary control flow, verify them during compilation, and carry known structure into native code."
section: compile-time
source: docs/language/constants.md
---

## Build incrementally during compilation

Generate a list of enabled endpoints from route configuration: filter in a loop and append text as you go. A Carven `const fn` runs these ordinary operations at compile time, and a `const test` checks the result before any C++ is generated.

```carven
struct Route { path: str, enabled: bool }

const fn route_list(routes: [Route; 3]) -> String {
    var text: String = {};
    for route in routes {
        if route.enabled {
            text.append(route.path);
            text.append("\n");
        }
    }
    return &&text;
}

const endpoints = route_list([
    { path: "/health", enabled: true },
    { path: "/users", enabled: true },
    { path: "/debug", enabled: false },
]);

const test {
    check(endpoints == "/health\n/users\n");
}
```

endpoints becomes the following text during compilation, with a newline after each path. The disabled `/debug` route is excluded. This builds a text list, not an HTTP router.

```text
/health
/users
```

While the function executes, `String` can grow, be copied, and be transferred. At the end of constant initialization, the result freezes into `str` backed by static storage. The running program does not need to repeat this construction loop.

Fixed arrays and supported structures can also be built incrementally. When constant initialization completes, an array result can become a read-only slice whose elements are held in static storage.

Save the code above as `routes.cv` and append a top-level statement that prints the list:

```carven
println(endpoints);
```

Run `carven routes.cv` to see the list. The program reads the generated static text without traversing the configuration or joining strings again. You can also pass this `str` to any interface that accepts it as text.

## Connect the construction process to a static result

C++ `constexpr`, `consteval`, and templates also express compile-time work. The handwritten C++20 comparison below is not compiler output. It keeps the same inputs and loop, then retains the text in an array behind a `string_view`:

```cpp
#include <array>
#include <string>
#include <string_view>

struct Route { std::string_view path; bool enabled; };

constexpr std::string route_list(std::array<Route, 3> routes) {
    std::string text;
    for (auto route : routes) {
        if (route.enabled) {
            text.append(route.path);
            text.append("\n");
        }
    }
    return text;
}

template <auto build>
consteval auto freeze() {
    std::array<char, build().size()> data{};
    auto text = build();
    for (std::size_t i = 0; i < data.size(); ++i) {
        data[i] = text[i];
    }
    return data;
}

constexpr auto data = freeze<[] {
    return route_list({{
        {"/health", true},
        {"/users", true},
        {"/debug", false},
    }});
}>();
constexpr std::string_view endpoints{data.data(), data.size()};
static_assert(endpoints == "/health\n/users\n");
```

The `freeze` helper supplies static storage for results of varying lengths. In C++20, a `std::string` may allocate during constant evaluation, but that allocation must be released before evaluation ends. Short strings may avoid allocation, so some standard-library implementations can retain this particular result directly as a `constexpr std::string`. The array approach also handles longer results: `freeze` runs the construction once in `build().size()` to determine the array type, then again to copy the characters into it. A static-string library can encapsulate these steps.

Carven evaluates supported source operations itself and freezes the working `String` into `str` when initialization completes. This happens before C++ generation, so the corresponding runtime text functions do not need to perform the same computation in C++ constant evaluation.

The [tutorial](/learn/constants/) teaches construction and freezing step by step, with a complete C++20 comparison.

## One algorithm, an explicit execution stage

Static execution contexts, such as constant initializers, array extents, constant blocks, and `const test`, can call only functions declared `const fn`. The compiler checks each `const fn` definition for compile-time capability: every reachable operation must be supported by the executor, and every function it calls must also be a `const fn`. A violation produces `CV-CONST-ADMISSION` at the definition, before anything calls it.

A `const fn` is still an ordinary function. A runtime call remains a runtime call, even when its arguments happen to be literals, so route_list can also build text from route configuration that is only known when the program runs. Static execution that cannot complete produces a diagnostic rather than falling back to runtime.

## Fix selected inputs while keeping runtime work

A function can declare `const` parameters to specialize on configuration while processing runtime data. `const if` selects an arm per instance; `const for` expands a static integer range. The full function contract remains checked in every source arm, and an ordinary runtime variable cannot supply the static input.

This also supplies fixed controls to SIMD operations such as extraction and byte shifts. The [tutorial](/learn/constants/#specialize-runtime-functions) shows a complete runtime specialization example; the [SIMD Reference](/reference/simd/) defines lane operations and native backend selection. Extraction offsets and shift counts are fixed at compilation and become generated C++ template arguments; the remaining data can still be processed at runtime.

## Verify before the program runs

The `const test` in the example runs during semantic analysis, independently of runtime test-artifact options. Change `/debug` to `enabled: true` and run `carven check routes.cv`: checking fails and reports the condition and the computed endpoint value.

```text
error [CV-CONST-TEST]: check failed
  condition: endpoints == "/health\n/users\n"
  operands:
    endpoints: "/health\n/users\n/debug\n"
 --> routes.cv:21:5
```

The report continues with the source lines of the test and the failed check. A passing test need not remain in the target program. It can check constant algorithms, generated tables, and constraints on fixed data.

Compile-time execution also supports explicit printing to observe construction and verification. That output belongs to the compilation stage; a later compilation failure does not undo it.

## Dynamic values can still have known structure

Preparing work does not require the whole result to be constant. A runtime order number may be unknown while the fixed text, integer base, and padding width are known:

```carven
fn print_order(id: i32) => println(f"Order {id:08x}");
```

For this integer format, Carven analyzes fixed segments and conversion requirements ahead of time, then generates writes that use that information directly. Runtime code converts the number and manages destination storage without parsing this format again. Known size bounds also help prepare capacity.

**Compute known results early; prepare known structure early.** Forms requiring general native formatting keep that path. Argument evaluation, side effects, borrowing observations, and failure behavior retain their source semantics.

## Combine values, control flow, and failure contracts

Static execution supports integers, `f32`/`f64`, booleans, characters, text and its byte views, C strings, SIMD vectors and masks, supported fixed arrays, slices, structures, and enums. A `const fn` can use the corresponding control flow, Read and Write parameters, pointers to live locals, and calls to `const fn`, including through local bindings of a named `const fn`. Native operations, text character iteration, classes, and callable values without a Carven body remain outside this subset. Execution steps, recursion depth, text work, and aggregate work are bounded.

Integer operations wrap to their type width at both stages. Division by zero and invalid shifts produce diagnostics when they execute during compilation.

`const fn` also executes typed failure creation, propagation, matching, recovery, and rethrow. The same validation logic can serve compile-time configuration and runtime input; see the [failure contract example](/learn/constants/#select-compile-time-configuration-with-the-same-failure-contracts). Floating arithmetic follows the compiler host's native environment; floating printing and formatting reuse native standard-library rules. See [constant execution rules](/reference/constants/) for accepted operations, result types, and resource limits.

Checked Unicode scalar conversion, UTF-8 encoding, prefix decoding, and whole-buffer validation use library `const fn` implementations. They can validate fixed data before native compilation using the same typed failures as runtime calls. Borrowed/owning text factories and the incremental validator currently require runtime execution; see the [Unicode example](/learn/constants/#validate-unicode-during-compilation).

Freezing preserves field and element types. It does not turn owning `String` fields inside a struct or array into `str`; completed aggregate constants must already have freezable components.

## Compile-time work without a retained result

`const { ... }` executes supported statements during semantic analysis, for example preparing text and printing information, without emitting runtime code. An optional label, as in `const "prepare table" { ... }`, identifies the block in diagnostics. Use a `const` binding to retain a value and `const test` to assert a result. All three participate in `carven check` before any C++ generation. Control flow and local values in a constant block still follow the same type, access, and execution-budget rules.
