---
title: Build and test with Carven
description: Keep tests beside business functions, describe the application in build.cv, and run the project's inline tests with carven test.
section: learn
lesson: 19
source: docs/language/build.md
---

## Keep a function and its tests together

A price calculation and its checks belong together. Write `test` blocks beside the function, include that business source in your application target, and run `carven test` for the project. The build script uses ordinary Carven code.

This lesson has three files: a pricing module with inline tests, an application entry, and `build.cv`. The same application plan drives `carven build`, `carven run`, `carven test`, and `carven query`.

## Prepare the local toolchain

Install [Carven 0.1.0](/learn/first-program/#install-carven-010), keep its matching Crafts resources, and put `carven` on `PATH`. Native builds need a C++20-capable compiler, SDK, and linker. The builder passes GCC/Clang-style arguments and uses `clang++` by default; `CXX` can select one compiler executable.

Run this project in a local terminal. The browser Playground does not launch the native compiler or execute project builds. This example requires no Xmake, CMake, or Node.js installation.

Create a directory named `shop` with this layout. Run the following commands from `shop`:

```text
shop/
├── build.cv
└── src/
    ├── pricing.cv
    └── main.cv
```

## Write the business code and inline tests

Save `src/pricing.cv`:

```carven
fn discounted(price: i32, percent: i32) -> i32 =>
    price * (100 - percent) / 100;

test "discounted price" {
    check(discounted(1200, 0) == 1200);
    check(discounted(1200, 25) == 900);
}
```

`discounted` calculates a price in integer minor currency units. The test is next to that function and checks the unchanged price and a 25% discount. Its two `check` calls belong to one named test. The examples use percentages from 0 through 100.

The function's bare declaration is visible to the other modules in this project. `export` is only needed for a separate cross-Craft API.

Save `src/main.cv`:

```carven
import .pricing using discounted;

println("Order total:", discounted(1200, 25));
```

The relative import selects `src.pricing`. The top-level print is the application's entry; it does not run when the test runner executes the inline tests.

## Describe the application once

Save `build.cv`:

```carven
import std::build using project;

project({
    targets: [{
        name: "shop",
        kind: .Executable,
        sources: ["src/main.cv", "src/pricing.cv"],
        ...
    }],
    ...
})?;
```

The CLI interprets this file as an ordinary Carven program. `std::build` is a [source library in the toolchain](https://github.com/ryblust/carven/blob/v0.1.0/crafts/carven/std/build.cv). Its `project` function selects the requested build action and calls native tools when needed. Functions, records, conditions, and failure handling retain their usual language meaning.

The plan declares one ordinary `shop` executable. Both files belong to that application target. `src/main.cv` is the entry, while `src/pricing.cv` contains the business function and its tests.

List both files in `sources`: explicit source roots select runtime tests in 0.1.0. The import makes the function available and loads its dependency for analysis; it does not select that dependency's runtime tests. Keeping the business module in the target's source list makes its inline tests part of `carven test`.

`project` supplies the expected `BuildPlan` type; its nested fields supply `BuildTarget`. Each trailing `...` default-initializes omitted fields, including native options and output paths. `?` forwards a `BuildError` from the script.

## Build and run the application

Build the native program:

```sh
carven build
```

The default output is `build/shop`, or `build/shop.exe` on Windows. Generated C++, objects, and dependency records stay under `build/.carven/`.

Build and run it:

```sh
carven run
```

After build status lines, the program prints:

```text
Order total: 900
```

The plan has one executable, so no target argument is needed. Application arguments follow `--`.

## Run the project's inline tests

From the same directory, run:

```sh
carven test
```

The builder takes the source roots from the ordinary application target and generates a test entry. It runs the test next to `discounted` while skipping the application's print. Test products go under `build/tests/shop/`.

The runner reports on `stderr`:

```text
carven: tests: 1 passed; 0 failed
```

Temporarily change the second expectation in `pricing.cv` from 900 to 901, then run `carven test` again. The report identifies the failed condition and its operands, and the command exits with a nonzero status. Restore 900 and rerun the command to return to a passing test.

As the application grows, keep tests beside the functions they verify and include those business files in the target's source roots. The same command runs their tests. When a plan has several targets, `carven test` runs each target's test suite; `carven test <target>` selects one.

## Query the same project for your editor

Inspect the plan without compiling the application:

```sh
carven query
```

The JSON contains `project.targets` with one `shop` entry:

| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| `name`         | `shop`                                               |
| `kind`         | `executable`                                         |
| `default`      | `true`                                               |
| `sources`      | Absolute paths to `src/main.cv` and `src/pricing.cv` |
| `dependencies` | Empty list                                           |

`project.root` identifies the directory, `project.roots` supplies watch paths, and `scripts` lists `build.cv` and its loaded source dependencies. The language server uses this model to choose application inputs. Your build, inline tests, and editor analysis share the application plan.

This example's query creates no build directory or C++ output. Application type errors do not block target discovery, but an invalid build script or a missing declared file can fail the query.

## Compose build options with ordinary functions

Build configuration is ordinary data. To choose native options in a function, replace `build.cv` with:

```carven
import std::build using { project, NativeOptions }

fn native_options(optimized: bool) -> NativeOptions => {
    compile_flags: if optimized { ["-O2"] } else { ["-O0", "-g"] },
    ...
};

project({
    targets: [{
        name: "shop",
        kind: .Executable,
        sources: ["src/main.cv", "src/pricing.cv"],
        native: native_options(true),
        ...
    }],
    ...
})?;
```

`native_options` returns a `NativeOptions` record. The condition chooses optimized or debugging flags; each `...` supplies the remaining defaults. The application sources and inline tests stay together in the same target. Run the same four commands again.

Larger scripts can use ordinary functions, conditions, loops, filesystem operations, or TOML parsing to assemble their plan. `project(plan)` dispatches `build`, `run`, `test`, and `query`; other statements still run normally during a query. A generator before `project` therefore runs during discovery too. Keep preparation in a separate script when querying should only inspect the plan, and reserve query `stdout` for its JSON model.

For source libraries, static-library boundaries, additional native options, and imperative `build(plan)` calls, use the [build reference](/reference/build/). Existing Xmake and CMake projects can use the [installed integrations](/reference/toolchain/).

## Exercise

Change the application discount to 10 and expect `Order total: 1080`. Add that case to the adjacent test in `pricing.cv`, then run `carven test`. Add another business module with its own inline tests and include it in the same target's `sources`.

To await work directly inside a test, use `async test`. Try the [online async tests](/playground/#example=async-tests) with **Test**, then apply that form beside your asynchronous business functions locally.
