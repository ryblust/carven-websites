---
title: "Build data at compile time"
description: "Organize loops and text construction with const fn, and understand freezing and execution stages."
section: learn
lesson: 12
source: docs/semantics.md
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

fn main() {
    println(heading);
}
```

With `carven main.cv`, the compilation stage prints Preparing title, then the launched program prints Build 0042. Running the generated executable on its own prints only Build 0042. heading's final type is str. String owns its contents during computation and freezes into static text when constant initialization finishes.

## const fn does not always run at compile time

In an ordinary runtime expression, `title(42)` remains an ordinary function call. A const fn declaration makes it eligible for required constant execution; const initializers, array lengths, const test, and similar contexts require that execution.

A const fn can use mutable locals, loops, supported arrays and structs, and String operations. An ordinary const initializer cannot directly contain arbitrary control-flow expressions. Put complex logic in a const fn.

## Run a block during compilation

Use a constant block when preparation needs execution but no retained result. Save this separate program as prepare.cv:

```carven
const {
    var label = String {};
    label.append("Preparing data");
    println(label);
}

fn main() {
    println("Running");
}
```

`carven check prepare.cv` prints `Preparing data` during checking and does not execute main. `carven prepare.cv` prints that line first, then the program prints `Running`. A constant block has no trailing semicolon; its local values end with the block.

A block may appear inside a function but still executes once during semantic analysis, independently of calls. It can read visible constants, not enclosing function parameters or runtime locals. Put compile-time operations that need a sequence in one block; order across blocks is unspecified. Use const test for assertions: a constant block does not create a test context.

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

fn main() {
    println(result);
}
```

This program computes `3.0` during compilation and prints it at runtime. f32/f64 values compose with calls, loops, arrays, and structs. Computation uses the compiler host's native floating environment; it does not define a separate floating arithmetic model. Floating values can also be formatted during compilation: `const label = f"{result:.2f}";` produces text with two decimal places.

## From building text to keeping the result

The heading example produces one value. Now turn the homepage text-joining example into a complete program: join three names with an ordinary loop, then retain the resulting text after compilation. Save this separately as menu.cv:

```carven
const fn join(items: [str; 3]) -> String {
    var text = String {};
    for item in items {
        if !text.is_empty() {
            text.append(" / ");
        }
        text.append(item);
    }
    return text;
}

const menu = join(["Home", "Docs", "About"]);

const test "menu" {
    check(menu == "Home / Docs / About");
}

fn main() {
    println(menu);
}
```

Run `carven menu.cv` to print `Home / Docs / About`. items supplies the input, join defines the algorithm, and const selects the execution stage. There is no separate result length or storage array to declare.

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

Save as menu.cpp, compile with `c++ -std=c++20 menu.cpp -o menu` using a toolchain with C++20 constexpr string support, and run `./menu`. The output matches; static_assert and const test both check the result during compilation.

Read the code in order: join computes the text; freeze obtains its length, uses it in the array type, then fills the array; data retains the characters, and menu views them. C++20 permits temporary allocation during constant evaluation, but an allocation still outstanding from that evaluation cannot simply become its retained result. The array crosses that storage boundary here. See the [C++20 constant-expression rules](https://timsong-cpp.github.io/cppwp/n4868/expr.const).

Carven includes this step in constant initialization: the working String freezes into str. A C++ project can encapsulate freeze in a static-string library; this comparison opens up that work rather than claiming a unique implementation.

Change About to Getting started in both versions and update the assertions. The result length changes: Carven source still only specifies the text, while the C++ freeze template determines a new array length. This compares construction and storage responsibilities, not execution speed.

## Pass a range at compile time

The ranges introduced in the control-flow lesson are also compile-time values. sum accepts a range, and the const initializer requires this call to execute at compile time.

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

fn main() {
    println(total);
}
```

The program prints `10`. The endpoint rules for `..` and `..=` are the same at compile time and runtime. Range patterns can also classify integers inside a const fn.

## Static tables

```carven
const table: [i32] = [2, 4, 6];
const middle = table.slice(1usize, 3usize);

fn main() {
    println(middle.len(), middle[0]);
}
```

The output is `2 4`. This is a frozen slice with static backing, so it can be returned and retained. A view into a runtime local array does not have that lifetime. Slice operations inside const fn remain outside the supported subset; an array result can freeze at the constant-initialization boundary.

## Failures and budgets

const test always runs during semantic analysis without a test-artifact option. A failed check fails compilation but continues the current test. require/fail stop that test; later static tests still run. Ordinary test uses a runtime runner.

Carven checks every branch of a const fn before execution. Integer overflow or an exhausted evaluation budget produces a compile error. See [constant execution rules](/reference/constants/) for accepted operations and result types.

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

const fn configured_port(value: i32) -> i32 {
    return try {
        port(value)?
    } catch {
        InvalidPort(_) => 8080,
    };
}

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
