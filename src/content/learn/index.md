---
title: "Run your first program"
description: "Set up the toolchain, run a .cv file, and distinguish native execution, interpretation, and C++ generation."
section: learn
lesson: 0
source: docs/cli.md
---

## What you will learn

Start with one runnable file and grow toward an order program whose failures leave stock unchanged. Each stage adds a reason to use the next language feature.

| Stage                                                                                                                     | What you will build or verify                                           |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Values](/learn/values/), [control flow](/learn/control/), [functions](/learn/functions/), and [data](/learn/aggregates/) | Calculate prices and represent stock                                    |
| [Access and ownership](/learn/ownership/), [text](/learn/text/), and [formatting](/learn/formatting/)                     | Distinguish reading, updating, transferring, and borrowing              |
| [Modules](/learn/modules/), [failures](/learn/failures/), and [callbacks](/learn/closures/)                               | Separate interfaces, combine failure contracts, and recover selectively |
| [Tests](/learn/testing/) and [compile-time computation](/learn/constants/)                                                | Verify behavior and construct static data before runtime                |
| [C++ integration](/learn/interop/) and [pointers](/learn/pointers/)                                                       | Connect native providers with explicit lifetime responsibilities        |
| [Order project](/learn/project/)                                                                                          | Combine validation, stock updates, recovery, and tests                  |

The C++ integration chapters are an extension: you can move from compile-time computation directly to the order project if you are concentrating on Carven code.

You should be comfortable using a terminal and editing text files. The first chapters do not require prior C++ knowledge. Native build responsibilities are introduced when we start using native libraries.

## Prepare the compiler

Carven generates C++. Building the compiler requires Git, Xmake, and a toolchain supporting the project's C++26 modules. The current repository is validated with LLVM/Clang and libc++ 23.1.0. Generated programs require at least C++20; host and target requirements are separate.

```sh
git clone https://github.com/ryblust/carven.git
cd carven
./xmakew build
```

On Windows, the repository wrapper is `.\xmakew.ps1`. The direct native execution mode used below currently targets POSIX. With an installed compiler, replace `./xmakew run carven` with `carven`.

## Write your first file

Save this as `main.cv` in the compiler repository root:

```carven
let answer = 20 + 22;
println("Answer:", answer);
```

`let` names a value that cannot be reassigned. `println` is available without an import, separates arguments with a space, and ends with a newline. These top-level statements execute in order as an implicit program entry. No function declaration is needed for this first program.

Run:

```sh
./xmakew run carven main.cv
```

Output:

```text
Answer: 42
```

Direct execution generates C++, compiles it, links it, and runs the executable. Set CXX to select the native compiler executable; the default is clang++.

## Inspect the generated result

```sh
./xmakew run carven compile --stdout main.cv
```

compile only generates artifacts. `--stdout` separates files with filename headings for inspection. To use the output in a build, write it to a directory:

```sh
./xmakew run carven compile -o generated main.cv
```

This program also fits the interpreter's supported subset:

```sh
./xmakew run carven interpret main.cv
```

The output is still Answer: 42. The interpreter does not implement every language feature. Later chapters on typed failures, closures, and C++ use native execution.

## Saving and running later examples

Unless stated otherwise, save each complete example containing main as main.cv, replacing the preceding example, and run `./xmakew run carven main.cv`. If a chapter contains several main functions, run them separately rather than joining them in one file or batch.

Local syntax fragments need the surrounding example context. Multi-file examples name their files and full input batch. Ordinary test requires generating and compiling a test entry; simply running the source file does not run it. const test executes during semantic analysis.

Later command tables use `carven` as shorthand for the executable. If it is not installed, use `./xmakew run carven` in the source repository. Native compilation commands still use clang++.

## Give the entry a name

As examples grow, we use an explicit main to keep the entry separate from reusable functions. Replace the whole file with:

```carven
fn main() {
    let answer = 20 + 22;
    println("Answer:", answer);
}
```

It prints the same output. `fn main()` declares the program entry; its braces contain the statements to execute. A batch may have only one entry: use either top-level executable statements or main. The next chapters use this explicit form while introducing variables, control flow, and then additional functions.

## Exercise

Change `20 + 22` to `20 + 2`; expect `Answer: 22`. Then remove the string from println; expect only `22`. Run both the execution and compile commands, and confirm that only execution performs this print. Try the top-level and explicit-main versions as separate files, one at a time.
