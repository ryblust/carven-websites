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

The output shows only artifacts that belong to the explicit inputs, headed `carven/generated/math.hpp`, `main.cpp`, and `math.cpp`. Automatically collected Crafts, such as the standard `std::utf` and `std::simd` modules, still take part in analysis but are not displayed; any dependency of the shown files appears only as an include. Writing to a directory with `compile -o generated` also produces the collected standard library under `generated/crafts/carven/std/`; a manual C++ build must compile the emitted implementations and required native providers too.

## Paths determine module names

A craft is a named source package. Your application files share one module domain; each craft has its own. This keeps a package's local imports within that package.

src/model.cv corresponds to src.model. In src/main.cv, `.model` selects src.model from the current logical directory. Unprefixed model selects from the current craft domain root.

crafts/json/parser.cv belongs to the json craft; another domain may select it as `json::parser`. `std::utf` selects the official crafts.carven.std.utf. Plain `std.utf` remains a path in the current domain.

`check`, `compile`, native execution, and `interpret` assemble their batches from explicit application files plus the fixed toolchain and project Crafts roots. This happens before import resolution and does not make imports search the filesystem.

## Select multiple names explicitly

Use a list to import several names from one module. For example, if the module provides Point and length:

```carven
import geometry.vector using { Point, length };
```

Single-line lists use spaces inside the braces and no trailing comma. The formatter expands longer lists to one name per line with a trailing comma. This layout does not change import meaning; the module must still be part of the compilation batch.

## Declare the audience

private is visible only within its module. A bare declaration is visible within its craft domain. export is visible to all domains in the current batch. Ordinary application files share the unprefixed domain, so the example's bare add can be imported by main.

A public interface cannot expose a type invisible to its readers. This includes parameters, results, failure types, struct fields, enum payloads, and nested callables. Exposing a private struct in an export result is rejected.

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

```carven
import std::core using String as Text;
import std::io using println as write_line;

let names: Vector<Text> = ["north", "south", "west"];
write_line(names.length(), names[1]);
```

It prints `3 south`. Text means the same type as String; write_line calls the same printing function as println. Aliases are useful when two imported names would clash or a local name makes the code clearer. They do not change how the type or function works.

Some common names, including String, Vector, Range, and println, are already available without imports. Other capabilities need explicit selections. Importing a function only introduces that function's name; if you name one of its result or error types too, import that type separately.

A public entry such as `std::utf` or `std::json` provides one module's API. Importing a parent path does not import all its children; `std::simd.bytes`, for example, is a separate module.

## Exercise

Move both files under src, change main's import to `.math`, and pass src/main.cv and src/math.cv to the command. Make add private and confirm that another module cannot import it, then restore the bare declaration.
