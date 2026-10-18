---
title: "Split a program into modules"
description: "Share functions and types between files, choose import names, and control which declarations are visible."
section: learn
lesson: 9
source: docs/language/modules.md
---

## Split the program into two files

Continue in the Carven repository root and save math.cv:

```carven
fn add(left: i32, right: i32) -> i32 => left + right;
```

Save main.cv:

```carven
import math using add;

println(add(20, 22));
```

Pass both files to the compiler:

```sh
./xmakew run carven main.cv math.cv
```

The output is 42. Import does not search the filesystem: the compilation batch must already include math.cv. Passing only main.cv reports `CV-IMPORT-RESOLUTION`. Input order does not control whether a function can be referenced.

The filename without .cv becomes part of the module name. It must contain only letters, digits, or underscores. It must not start with a digit. `my-math.cv` is rejected; use `my_math.cv`.

To inspect the generated C++, run:

```sh
./xmakew run carven compile --stdout main.cv math.cv
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
import math using { add, subtract };

println(add(20, 22), subtract(20, 4));
```

Run `./xmakew run carven main.cv math.cv`. The output is `42 16`.

Use `carven-format` to arrange import lists; the [workflow chapter](/learn/workflow/) shows its commands.

## Declare the audience

private is visible only within its module. A bare declaration is visible within its craft domain. export is visible to all domains in the current batch. Ordinary application files share the unprefixed domain, so the example's bare add can be imported by main.

To expose a function from a separate craft, create the directory crafts/pricing and save crafts/pricing/quote.cv:

```carven
private fn delivery(quantity: i32) -> i32 => if quantity >= 10 { 0 } else { 8 };

export fn total(price: i32, quantity: i32) -> i32 => price * quantity + delivery(quantity);
```

Replace main.cv in the repository root:

```carven
import pricing::quote using total;

println(total(12, 3));
```

Pass these files to the compiler:

```sh
./xmakew run carven main.cv crafts/pricing/quote.cv
```

The output is 44. `total` is exported from the pricing craft. It can call the private `delivery` helper in its own module; main.cv cannot import that helper. Removing `export` from `total` makes it visible only within pricing and rejects the import from main.cv.

A public interface must use types visible to its callers. See [module visibility](/reference/modules/) when exporting types as well as functions.

## Build a project

As the project grows, let Xmake collect the batch and native dependencies. In a consuming project's xmake.lua:

```text
add_repositories("carven-xmake-repo https://github.com/ryblust/carven-xmake-repo.git")
add_requires("carven")
target("app")
    set_kind("binary")
    add_rules("@carven/carven")
    add_files("src/**.cv")
```

The rule obtains matching compiler and Crafts versions and generates output before C++ dependency scanning. Native include paths and libraries are build inputs; Carven import does not add them automatically.

## Import a capability and choose local names

Standard modules use the std:: prefix. You can select a name as it is, or give it a local alias with as:

```carven run
import std::core using String as Text;
import std::io using println as write_line;

let names: Vector<Text> = ["north", "south", "west"];
write_line(names.length(), names[1]);
```

It prints `3 south`. Text means the same type as String; write_line calls the same printing function as println. Aliases are useful when two imported names would clash or a local name makes the code clearer. They do not change how the type or function works.

Importing a function only introduces that function's name; if you name a non-default result or error type too, import that type separately.

Importing a parent path does not import its child modules. Look up an API's module in the [standard API index](/reference/library/).

## Use default names and import other names

`String` belongs to `std::core` and is available by default. Naming `NumberParseError` from the same module requires an explicit import. Default bindings supply selected names, rather than every declaration in a module.

The [module reference](/reference/modules/#standard-modules-and-defaults) lists each API's module, default bindings, and whether its behavior is defined by the compiler or source code.

## Exercise

Return to the first main.cv and math.cv pair. Move them under src, change main's import to `.math`, and run `./xmakew run carven src/main.cv src/math.cv`. Make add private and confirm that another module cannot import it, then restore the bare declaration.
