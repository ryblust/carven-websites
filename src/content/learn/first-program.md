---
title: "Run your first program"
description: "Set up the toolchain, run a .cv file, and distinguish native execution, interpretation, and C++ generation."
section: learn
lesson: 1
source: docs/language/tutorial.md
---

This is the first hands-on chapter. See the [tutorial overview](/learn/) for the learning route and final project.

## Prepare the compiler

Carven generates C++. Building the compiler requires Git, Xmake 3.1.1, and LLVM/Clang with libc++ supporting the project's C++26 modules. LLVM 23 is the validated toolchain version; on Windows, use LLVM-MinGW. Generated programs use C++20.

```sh
git clone https://github.com/ryblust/carven.git
cd carven
./xmakew build
```

On Windows, the repository wrapper is `.\xmakew.ps1`. Direct native execution uses a C++ toolchain without requiring Xmake. With an installed compiler, replace `./xmakew run carven` with `carven`.

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

The output is still Answer: 42. The interpreter does not implement every language feature. Later chapters use native execution throughout; typed failures can also be interpreted, while closures and C++ operations require native execution.

## Check without running

```sh
./xmakew run carven check main.cv
```

check runs the same semantic analysis as the other commands, including required compile-time evaluation, then stops. It writes no C++, invokes no native compiler, and does not run the program. A successful check prints `carven: check passed` on stderr. Add `--timings` to any command to see how long each stage took; the report also goes to stderr:

```sh
./xmakew run carven check --timings main.cv
```

## Saving and running later examples

Unless stated otherwise, save each complete example as main.cv, replacing the preceding example, and run `./xmakew run carven main.cv`. If a chapter contains several complete programs, run them separately rather than joining them in one file or batch. File names must be valid identifiers: `main.cv` and `order_items.cv` work, `my-file.cv` does not.

Local syntax fragments need the surrounding example context. Multi-file examples name their files and full input batch. Run ordinary tests with `carven --tests main.cv`, or `carven interpret --tests main.cv` for the supported subset; a plain program run does not execute them. `const test` executes during semantic analysis.

Later command tables use `carven` as shorthand for the executable. If it is not installed, use `./xmakew run carven` in the source repository. Native compilation commands still use clang++.

## Give the entry a name

Top-level statements suit short programs. When you want the entry to stand apart from reusable functions, name it main instead. Replace the whole file with:

```carven
fn main() {
    let answer = 20 + 22;
    println("Answer:", answer);
}
```

It prints the same output. `fn main()` declares the program entry; its braces contain the statements to execute. A batch may have only one entry: use either top-level executable statements or main. The next chapters keep using top-level statements and add functions and types above them; later chapters use main where a named entry helps.

## Exercise

Change `20 + 22` to `20 + 2`; expect `Answer: 22`. Then remove the string from `println`; expect only `22`. Run `check`, `compile --stdout`, and direct execution, and confirm that only execution performs this print. Try the top-level and explicit-main versions as separate files, one at a time.
