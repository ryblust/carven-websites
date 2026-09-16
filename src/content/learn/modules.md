---
title: "Split a program into modules"
description: "Split source files and understand explicit batches, import paths, and visibility."
section: learn
lesson: 8
source: docs/semantics.md
---

## Split the program into two files

Continue in the Carven repository root and save math.cv:

```carven
fn add(left: i32, right: i32) -> i32 => left + right;
```

Save main.cv:

```carven
import math using add;

fn main() {
    println(add(20, 22));
}
```

Pass both files to the compiler:

```sh
./xmakew run carven main.cv math.cv
```

The output is 42. Import does not search the filesystem: the compilation batch must already include math.cv. Input order does not control whether a function can be referenced.

## Paths determine module names

src/model.cv corresponds to src.model. In src/main.cv, `.model` selects src.model from the current logical directory. Unprefixed model selects from the current craft domain root.

crafts/json/parser.cv belongs to the json craft; another domain may select it as `json::parser`. `std::utf.text` selects the official crafts.carven.std.utf.text. Plain `std.utf` remains a path in the current domain.

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

## Exercise

Move both files under src, change main's import to `.math`, and pass src/main.cv and src/math.cv to the command. Make add private and confirm that another module cannot import it, then restore the bare declaration.
