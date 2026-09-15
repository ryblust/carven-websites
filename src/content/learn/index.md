---
title: "Your first program"
description: "Set up the toolchain, run a .cv file, and distinguish native execution, interpretation, and C++ generation."
section: learn
lesson: 0
source: docs/cli.md
---

## What you will learn

This tutorial starts with one file, then introduces values, functions, control flow, data structures, ownership, text, closures, failures, modules, compile-time execution, and C++ integration. It ends with a small program that validates input and recovers from failures. Each chapter includes complete examples, expected results, and exercises.

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
fn add(left: i32, right: i32) -> i32 {
    return left + right;
}

fn main() {
    let answer = add(20, 22);
    println("Answer:", answer);
}
```

`fn` declares a function. The parameter type i32 is a signed 32-bit integer. `-> i32` specifies the success result type; return supplies its value. let creates a local owner that cannot be reassigned. println is available without an import, separates arguments with a space, and ends with a newline.

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

## A top-level entry

Small scripts can consist of top-level statements:

```carven
let answer = 20 + 22;
println("Answer:", answer);
```

These statements form an implicit entry. A batch can have only one entry, so do not put this fragment and the earlier main in the same batch.

## Exercise

Change the second argument to add to 2. Expect Answer: 22. Then remove the string from println; expect only 22. Run both the execution and compile commands, and confirm that only execution performs the print inside main.
