---
title: "Build data at compile time"
description: "Organize loops and text construction with `const fn`, and understand freezing and execution stages."
section: learn
lesson: 13
source: docs/language/constants.md
---

## Prepare a static heading

```carven
const fn title(value: i32) -> String {
    println("Preparing title");
    return f"Build {value:04}";
}

const heading = title(42);

const test "heading" {
    check(heading == "Build 0042");
}

println(heading);
```

With `carven main.cv`, the compilation stage prints Preparing title, then the launched program prints Build 0042. Running the generated executable on its own prints only Build 0042. heading's final type is `str`. `String` owns its contents during computation and freezes into static text when constant initialization finishes.

## `const fn` does not always run at compile time

In an ordinary runtime expression, `title(42)` remains an ordinary function call. A `const fn` declaration makes it eligible for static execution; `const` initializers, array lengths, constant blocks, `const test`, and similar contexts require that execution. Those contexts call only functions explicitly declared `const fn`.

A `const fn` can use mutable locals, loops, supported arrays, slices and structs, and `String` operations. An ordinary `const` initializer cannot directly contain arbitrary control-flow expressions. Put complex logic in a `const fn`.

The compiler checks each `const fn` definition for compile-time capability, even before anything calls it. Every function it can reach must also be a `const fn`. Save this as admission.cv:

```carven
fn double(value: i32) -> i32 => value * 2;

const fn quadruple(value: i32) -> i32 => double(double(value));

println(quadruple(3));
```

`carven check admission.cv` reports the problem at the definition:

```text
error [CV-CONST-ADMISSION]: const fn can only call an explicitly declared const fn
```

Declare double as `const fn` and the program prints `12`. The check covers operations and callees, not every input: division by zero, exhausted budgets, and failed assertions are still found only when a particular call executes.

## Run a block during compilation

Use a constant block when preparation needs execution but no retained result. Save this separate program as prepare.cv:

```carven
const "prepare data" {
    var label: String = {};
    label.append("Preparing data");
    println(label);
}

println("Running");
```

`carven check prepare.cv` prints `Preparing data` during checking and does not execute the program. `carven prepare.cv` prints that line first, then the program prints `Running`. The string after `const` is an optional label used in diagnostics; labels need not be unique. `var label: String = {};` uses contextual construction: the annotation supplies the type for `{}`. A constant block has no trailing semicolon; its local values end with the block.

A module-scope block executes once. In a function body, a block executes once per selected instance or expanded `const for` occurrence; an unselected `const if` arm does not execute it. Ordinary runtime control does not select static work. The block can read enclosing constants, `const` parameters, and `const for` indices, but not runtime parameters or locals. Static operations in one body execute in source order; order between bodies and module-scope blocks is unspecified. Use `const test` for assertions outside a test body.

## Floating computation

```carven
const fn average(values: [f64; 3]) -> f64 {
    var total = 0.0;
    for value in values {
        total += value;
    }
    return total / 3.0;
}

const result = average([1.5, 3.0, 4.5]);

const test "average at compile time" {
    check(result == 3.0);
}

println(result);
```

This program computes `3.0` during compilation and prints it at runtime. `f32`/`f64` values compose with calls, loops, arrays, and structs. Computation uses the compiler host's native floating environment; it does not define a separate floating arithmetic model. Floating values can also be formatted during compilation: `const label = f"{result:.2f}";` produces text with two decimal places.

## From building text to keeping the result

The heading example produces one value. Now build text in a complete program: join three names with an ordinary loop, then retain the resulting text after compilation. Save this separately as menu.cv:

```carven
const fn join(items: [str; 3]) -> String {
    var text: String = {};
    for item in items {
        if !text.is_empty() {
            text.append(" / ");
        }
        text.append(item);
    }
    return &&text;
}

const menu = join(["Home", "Docs", "About"]);

const test "menu" {
    check(menu == "Home / Docs / About");
}

println(menu);
```

Run `carven menu.cv` to print `Home / Docs / About`. items supplies the input, join defines the algorithm, and `const` selects the execution stage. There is no separate result length or storage array to declare.

### The same task in C++20

This standalone handwritten comparison is not Carven's generated output. It keeps the same join algorithm, then uses freeze to give the computed result static storage:

```cpp
#include <array>
#include <iostream>
#include <string>
#include <string_view>

constexpr std::string join(std::array<std::string_view, 3> items) {
    std::string text;
    for (auto item : items) {
        if (!text.empty()) {
            text.append(" / ");
        }
        text.append(item);
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
    return join({"Home", "Docs", "About"});
}>();
constexpr std::string_view menu{data.data(), data.size()};
static_assert(menu == "Home / Docs / About");

int main() {
    std::cout << menu << '\n';
}
```

Save as menu.cpp, compile with `c++ -std=c++20 menu.cpp -o menu` using a toolchain with C++20 `constexpr` string support, and run `./menu`. The output matches; `static_assert` and `const test` both check the result during compilation.

Read the code in order: join computes the text; freeze obtains its length, uses it in the array type, then fills the array; data retains the characters, and menu views them. C++20 permits temporary allocation during constant evaluation, but an allocation still outstanding from that evaluation cannot simply become its retained result. The array crosses that storage boundary here. See the [C++20 constant-expression rules](https://timsong-cpp.github.io/cppwp/n4868/expr.const).

Carven includes this step in constant initialization: the working `String` freezes into `str`. A C++ project can encapsulate freeze in a static-string library; this comparison opens up that work rather than claiming a unique implementation.

Change About to Getting started in both versions and update the assertions. The result length changes: Carven source still only specifies the text, while the C++ freeze template determines a new array length. This compares construction and storage responsibilities, not execution speed.

## Pass a range at compile time

The ranges introduced in the control-flow lesson are also compile-time values. sum accepts a range, and the `const` initializer requires this call to execute at compile time.

```carven
const fn sum(values: range<i32>) -> i32 {
    var total = 0;
    for value in values {
        total += value;
    }
    return total;
}

const values = 1..=4;
const total = sum(values);

const test "range total" {
    check(total == 10);
}

println(total);
```

The program prints `10`. The endpoint rules for `..` and `..=` are the same at compile time and runtime. Range patterns can also classify integers inside a `const fn`.

## Static tables

```carven
const table: [i32] = [2, 4, 6];
const middle = table.slice(1, 3);

println(middle.len(), middle[0]);
```

The output is `2 4`. The slice parameters supply `usize` to the unsuffixed bounds, so explicit suffixes are unnecessary. This is a frozen slice with static backing, so it can be returned and retained. A view into a runtime local array does not have that lifetime.

## Filter a route table

Slices, Write parameters, and byte iteration also work inside `const fn`. Save this as routes.cv. It keeps only enabled routes whose path starts with `/` and contains no space:

```carven
struct Route {
    path: str,
    enabled: bool,
}

const fn valid_path(path: str) -> bool {
    if path.is_empty() || path.bytes[0] != "/".bytes[0] {
        return false;
    }
    for byte in path.bytes {
        if byte == " ".bytes[0] {
            return false;
        }
    }
    return true;
}

const fn add_route(&text: String, path: str) {
    text.append(path);
    text.append("\n");
}

const fn route_list(routes: [Route]) -> String {
    var text: String = {};
    for route in routes {
        if route.enabled && valid_path(route.path) {
            add_route(&text, route.path);
        }
    }
    return &&text;
}

const routes: [Route] = [
    { path: "/health", enabled: true },
    { path: "/users", enabled: true },
    { path: "/debug", enabled: false },
    { path: "orders", enabled: true },
];

const endpoints = route_list(routes);

const test {
    check(endpoints == "/health\n/users\n");
}

print(endpoints);
```

`carven routes.cv` prints `/health` and `/users` on separate lines. Each array element uses contextual construction: the `[Route]` annotation supplies the element type. `path.bytes` is a `[u8]` view of the text; `"/".bytes[0]` and `" ".bytes[0]` obtain the bytes for `/` and space directly from readable text. add_route receives `&text` with Write access and appends in place. The anonymous `const test` checks the result during compilation.

Change `/debug` to `enabled: true` and run `carven check routes.cv`. The static test fails with the same condition and operand layout as a runtime report:

```text
error [CV-CONST-TEST]: check failed
  condition: endpoints == "/health\n/users\n"
  operands:
    endpoints: "/health\n/users\n/debug\n"
```

The diagnostic continues with a source excerpt pointing at the check. Restore `enabled: false` before continuing.

## Specialize runtime functions

A `const` parameter fixes an input during compilation while leaving other inputs and the body at runtime. Save this separate program as specialize.cv:

```carven
fn adjust(value: i32, const enabled: bool, const count: i32) -> i32 {
    const if enabled {
        var result = value;
        const for index in 0..count {
            result += index;
        }
        return result;
    } else {
        return value;
    }
}

println(adjust(10, true, 4), adjust(10, false, 4));
```

It prints `16 10`. `const if` selects the generated arm for each distinct static input list. `const for` expands the integer range and makes each index a static binding. All source arms still undergo type, ownership, and failure checking; selection cannot repair an invalid contract. An ordinary runtime `let`, parameter, or `for` index cannot supply a static argument. Wrappers forwarding one must repeat `const` in their parameter declaration.

`const fn` permits execution in the static stage; a `const` parameter specifies a static input. They are independent. Static arguments execute during specialization before residual runtime arguments. Equal typed static values can share an instance whose C++ signature contains only runtime parameters. Functions with static parameters require direct calls and cannot use `import(cpp)` or `export(cpp)`. Expansion has finite budgets and never silently falls back to a runtime loop. See [function Reference](/reference/functions/#static-parameters).

## Validate Unicode during compilation

Use the same checked UTF algorithms for constant input and ordinary runtime calls. Save this as unicode.cv:

```carven
import std::utf.codec using encode_utf8;
import std::utf.validation using validate_utf8;

const encoded = encode_utf8('😀');
const bytes: [u8] = encoded.bytes;
const { validate_utf8(bytes.slice(0, encoded.width))?; }

const test "UTF-8 encoding" {
    check(encoded.width == 4);
    check(bytes[0] == 0xf0);
}

println(encoded.width, bytes[0]);
```

The program prints `4 240`. `encode_utf8` always returns a four-byte array; only `width` bytes belong to the encoded scalar. Slice to that width before validation so padding does not become extra NUL characters. Checked scalar conversion, prefix decoding, and whole-buffer validation are also `const fn`; their typed failures need explicit `?`.

`from_utf8` and `to_string` currently require runtime execution because unchecked borrowed text construction is excluded from the executor. The incremental `UTF8Validator` also requires runtime execution because it is a class. Freezing preserves struct field and array element types, so a struct containing owning `String` cannot become a constant by turning that field into `str`. See [UTF Reference](/reference/utf/).

## Count bytes in SIMD blocks

The `std::simd.bytes` Craft traverses fixed 32-byte logical blocks. Save this as blocks.cv:

```carven
import std::simd.bytes using { block_count, load_block };

const fn count_byte(bytes: [u8], needle: u8) -> usize {
    var count: usize = 0;
    for index in 0..block_count(bytes) {
        let block = load_block(bytes, index * 32);
        count += ((block.value == needle) & block.active).count();
    }
    return count;
}

const zeros = count_byte("A\0B".bytes, 0);
const test { check(zeros == 1); }

let text: String = "A\0B";
println(zeros, count_byte(text.bytes, 0));
```

It prints `1 1`: one count executes during compilation and the other at runtime. `block.value == needle` returns a per-lane mask. The final block is zero-filled, so `& block.active` excludes padding that would otherwise match the zero byte. Partial loads read only the supplied slice; no alignment or padding is required.

Builtin vectors also include `u8x16`, `f32x4`, and `f32x8`, with corresponding masks. Native execution selects portable lanes, AArch64 NEON, or consumer-enabled x86 AVX2 at compilation; there is no runtime dispatch. Logical width does not promise one hardware register or a speedup. Translation units using SIMD or runtime text support must agree on backend flags. Static execution uses the same lane contracts independently of the host instruction set. See [SIMD Reference](/reference/simd/) for bounds, static controls, and floating limits.

## Failures and budgets

`const test` always runs during semantic analysis without a test-artifact option. A failed check fails compilation but continues the current test. require/fail stop that test; later static tests still run. Ordinary test uses a runtime runner. A failed assert during compile-time execution reports `CV-ASSERT`.

Integer arithmetic wraps at the type's width at compile time exactly as at runtime: `2147483647 * 2` computed by a `const fn` yields `-2` in both stages. Division by zero and invalid shift counts, which terminate at runtime, are compile errors when executed during compilation. An exhausted evaluation budget also produces a compile error. See [constant execution rules](/reference/constants/) for accepted operations and result types.

## Select compile-time configuration with the same failure contracts

Validation, propagation, and recovery can execute in Carven's compilation stage. The port validator works at runtime and in constant initialization, using the same error-handling logic.

```carven
struct InvalidPort { value: i32 }

const fn port(value: i32) -> i32 throw InvalidPort {
    if value < 1 || value > 65535 {
        throw InvalidPort { value };
    }
    return value;
}

const fn configured_port(value: i32) -> i32 => try {
    port(value)?
} catch {
    InvalidPort(_) => 8080,
};

const selected = configured_port(0);
const explicit_port = port(443)?;

const test "port selection" {
    check(selected == 8080);
    check(explicit_port == 443);
}
```

`configured_port` recovers invalid input inside the function. `port(443)?` explicitly propagates to the constant evaluation entry; changing 443 to 0 produces a compilation diagnostic. Omitting `?` remains invalid even for successful input: one successful evaluation does not erase the function's failure contract.

## Exercise

Change the static assertion to an incorrect string and confirm that compilation fails. Restore it and run `compile --stdout`: compile-time output goes to stderr, leaving stdout for generated artifacts.
