---
title: "Run your first program"
description: "Prepare the toolchain, run a .cv file, and see how it becomes a C++ program."
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

```carven run
let unit_price = 1200;
let quantity = 3;
println("Order total:", unit_price * quantity);
```

`let` names a value that cannot be reassigned. `println` is available without an import, separates arguments with a space, and ends with a newline. These top-level statements execute in order as an implicit program entry. The calculation uses integer minor currency units, keeping this first example exact. No function declaration is needed for the implicit entry.

Click **Run** in the code block to execute this example in your browser. To run the saved file locally:

```sh
./xmakew run carven main.cv
```

Output:

```text
Order total: 3600
```

Direct execution generates C++, compiles it, links it, and runs the executable. See the [toolchain reference](/reference/toolchain/) to select a native compiler.

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

The output is still Order total: 3600. Use this command when you want to run supported Carven code without compiling C++. Later chapters use native execution by default, so their examples also work when they call C++ or create capturing closures.

## Check without running

```sh
./xmakew run carven check main.cv
```

check validates the source without running the program; explicitly requested compile-time work still executes. A successful check prints `carven: check passed` on stderr. Add `--timings` to see stage durations on stderr:

```sh
./xmakew run carven check --timings main.cv
```

## Saving and running later examples

Unless a lesson gives another filename, save each complete example as main.cv. Replace the previous example. Run `./xmakew run carven main.cv`. If a chapter contains several complete programs, run them separately rather than joining them in one file or batch. File names must be valid identifiers: `main.cv` and `order_items.cv` work, `my-file.cv` does not.

A fragment that extends an earlier program says which declarations to keep. Multi-file examples list every file to pass to the compiler. The testing chapter introduces the separate commands for running tests; ordinary execution runs the application, not its tests.

Later command tables use `carven` as shorthand for the executable. If it is not installed, use `./xmakew run carven` in the source repository. Native compilation commands still use clang++.

## Give the entry a name

Top-level statements suit short programs. When you want the entry to stand apart from reusable functions, name it main instead. Replace the whole file with:

```carven run
fn main() {
    let unit_price = 1200;
    let quantity = 3;
    println("Order total:", unit_price * quantity);
}
```

It prints the same output. `fn main()` declares the program entry; its braces contain the statements to execute. A program may have only one entry: use either top-level executable statements or main. The next chapters keep using top-level statements and add functions and types above them; later chapters use main where a named entry helps.

## Exercise

Change quantity from `3` to `4`; expect `Order total: 4800`. Then remove the string from `println`; expect only `4800`. Run `check`, `compile --stdout`, and direct execution, and confirm that only execution performs this print. Try the top-level and explicit-main versions as separate files, one at a time.
