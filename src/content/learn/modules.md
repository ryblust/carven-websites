---
title: "Split a program into modules"
description: "Share functions and types between files, choose import names, and control which declarations are visible."
section: learn
lesson: 9
source: docs/language/modules.md
---

## Split the program into two files

In your exercise directory, save math.cv beside main.cv:

```carven
fn add(left: i32, right: i32) -> i32 => left + right;
```

Save main.cv:

```carven
import math using add;

println(add(20, 22));
```

Run the program from its entry file:

```sh
carven run main.cv
```

The output is 42. The import locates math.cv in the project and selects it as a dependency. You do not need to list it again. Only the reached source closure participates in analysis; an unrelated file does not add diagnostics or static effects. Explicit inputs remain useful when selecting extra roots, including modules whose tests you want to run.

The filename without .cv becomes part of the module name. It must contain only letters, digits, or underscores. It must not start with a digit. `my-math.cv` is rejected; use `my_math.cv`.

To inspect the generated C++, run:

```sh
carven compile --stdout main.cv
```

The output shows the generated files for main.cv and math.cv. See the [toolchain reference](/reference/toolchain/) to write artifacts to a directory or use them in a C++ build.

## Paths determine module names

A craft is a named source package. Your application files share one module domain; each craft has its own. This keeps a package's local imports within that package.

src/model.cv corresponds to src.model. In src/main.cv, `.model` selects src.model from the current logical directory. Unprefixed model selects from the current craft domain root.

crafts/json/parser.cv belongs to the json craft; another domain may select it as `json::parser`. `std::utf` selects the official crafts.carven.std.utf. Plain `std.utf` remains a path in the current domain.

See the [module reference](/reference/modules/) for how toolchain and project Crafts join the compilation batch.

## Select multiple names explicitly

Add another function to math.cv:

```carven
fn subtract(left: i32, right: i32) -> i32 => left - right;
```

Replace main.cv with a program that imports both functions:

```carven
import math using { add, subtract }

println(add(20, 22), subtract(20, 4));
```

Run `carven run main.cv`. The output is `42 16`.

A `using { ... }` list ends at `}` without a semicolon; single-name imports end with `;`. Use `carven format` to arrange import lists; the [workflow chapter](/learn/workflow/) shows its commands.

## Control declaration visibility

Use bare declarations for functions shared between files in your project. Ordinary application files share one module domain, so main.cv can import the example's `add` without `export`. Use `private` for a helper confined to one module and `export` for an API consumed by another Craft.

To expose a function from a separate craft, create the directory crafts/pricing and save crafts/pricing/quote.cv:

```carven
private fn delivery(quantity: i32) -> i32 => if quantity >= 10 { 0 } else { 8 };

export fn total(price: i32, quantity: i32) -> i32 => price * quantity + delivery(quantity);
```

Replace main.cv in the exercise directory:

```carven
import pricing::quote using total;

println(total(12, 3));
```

Run the entry; the import finds the project's pricing Craft:

```sh
carven run main.cv
```

The output is 44. `total` is exported from the pricing craft. It can call the private `delivery` helper in its own module; main.cv cannot import that helper. Removing `export` from `total` makes it visible only within pricing and rejects the import from main.cv.

A public interface must use types visible to its callers. See [module visibility](/reference/modules/) when exporting types as well as functions.

## Describe a native project

Save this as build.cv beside main.cv and math.cv:

```carven
import std::build using project;

project({
    targets: [{
        name: "app",
        kind: .Executable,
        sources: ["main.cv"],
        ...
    }],
    ...
})?;
```

The expected `BuildPlan` and `BuildTarget` types supply the record types. Each trailing `...` defaults omitted fields. The main.cv import selects math.cv as a dependency. Run `carven build` to build, `carven run` to build and run, `carven test` to run the target's tests, or `carven query` to inspect its source model. Run these commands in the directory containing build.cv.

If math.cv contains runtime tests, also list it in the target's `sources` to select those tests. Imports load dependencies for analysis; explicit source roots select runtime tests. The [build lesson](/learn/build/) applies this to tests beside business code.

For an existing Xmake or CMake project, use the toolchain's [build integrations](/reference/toolchain/). Keep native include paths, compiler options, and linked libraries in that build configuration.

## Import a capability and choose local names

Standard modules use the std:: prefix. You can select a name as it is, or give it a local alias with as:

```carven run
import std::core using String as Text;
import std::io using println as write_line;

let names: Vector<Text> = ["north", "south", "west"];
write_line(names.length(), names[1]);
```

It prints `3 south`. `Text` means the same type as `String`; write_line calls the same printing function as `println`. Aliases are useful when two imported names would clash or a local name makes the code clearer. They do not change how the type or function works.

Importing a function only introduces that function's name; if you name a non-default result or error type too, import that type separately.

Importing a parent path does not import its child modules. Look up an API's module in the [standard API index](/reference/library/).

## Use default names and import other names

`String` belongs to `std::core` and is available by default. Naming `NumberParseError` from the same module requires an explicit import. Default bindings supply selected names, rather than every declaration in a module.

The [module reference](/reference/modules/#standard-modules-and-defaults) lists each API's module, default bindings, and whether its behavior is defined by the compiler or source code.

## Exercise

Return to the first main.cv and math.cv pair. Move them under src, change main's import to `.math`, and run `carven run src/main.cv`. Make `add` private and confirm that another module cannot import it, then restore the bare declaration.
