---
title: "Run your first program"
description: "Prepare the toolchain, run a .cv file, and see how it becomes a C++ program."
section: learn
lesson: 1
source: docs/language/tutorial.md
---

This is the first hands-on chapter. See the [tutorial overview](/learn/) for the learning route and final project.

## Install Carven 0.1.0

Install the [0.1.0 toolchain](https://github.com/ryblust/carven/releases/tag/v0.1.0) for macOS Apple Silicon, Linux x64, or Windows x64. It includes the compiler, formatter, language server, analyzer, Crafts, and C++ hosting SDK. The installers verify the archive checksum. No Node.js or compiler build is needed for installation.

On macOS and Linux:

```sh
curl -fsSL https://github.com/ryblust/carven/releases/download/v0.1.0/install.sh | sh -s -- --version 0.1.0
export PATH="$HOME/.local/bin:$PATH"
```

The installer places the toolchain in `$XDG_DATA_HOME/carven`, or `~/.local/share/carven` when that variable is unset or empty, and links its commands into `~/.local/bin`.

In Windows PowerShell:

```powershell
Invoke-WebRequest https://github.com/ryblust/carven/releases/download/v0.1.0/install.ps1 -OutFile install.ps1
.\install.ps1 -Version 0.1.0
$env:Path = "$env:LOCALAPPDATA\Programs\Carven\bin;$env:Path"
```

The `PATH` changes above apply to the current terminal. Add the same command directory to your shell startup configuration or Windows user `Path` for future terminals. Verify the installed version:

```sh
carven --version
```

It prints `carven v0.1.0`. Keep the toolchain directory together so its commands can find their matching Crafts and companion tools. To build the compiler yourself, follow the [source build instructions](https://github.com/ryblust/carven/blob/v0.1.0/README.md#development).

Carven generates C++20. Native execution needs a C++20-capable compiler, SDK, and linker in your environment. The default compiler is `clang++`; set `CXX` to select another compiler. Interpretation and semantic checking do not require native compilation.

## Write your first file

Create a directory for your exercises and open a terminal there. Save this as `main.cv`:

```carven run
let unit_price = 1200;
let quantity = 3;
println("Order total:", unit_price * quantity);
```

`let` names a value that cannot be reassigned. `println` is available without an import, separates arguments with a space, and ends with a newline. These top-level statements execute in order as an implicit program entry. The calculation uses integer minor currency units, keeping this first example exact. No function declaration is needed for the implicit entry.

Click **Run** in the code block to execute this example in your browser. To run the saved file locally:

```sh
carven run main.cv
```

Output:

```text
Order total: 3600
```

`carven run` generates C++, compiles it, links it, and runs `build/main` (`build/main.exe` on Windows). See the [toolchain reference](/reference/toolchain/) to select a native compiler.

## Inspect the generated result

```sh
carven compile --stdout main.cv
```

`carven compile` only generates artifacts. `--stdout` separates files with filename headings for inspection. To use the output in a build, write it to a directory:

```sh
carven compile -o generated main.cv
```

This program also fits the interpreter's supported subset:

```sh
carven interpret main.cv
```

The output is still `Order total: 3600`. Use this command when you want to run supported Carven code without compiling C++. Later chapters use native execution by default. Capturing closures also work in the interpreter; arbitrary C++ calls require native execution or an explicit host binding.

## Check without running

```sh
carven check main.cv
```

`carven check` validates the source without running the program; explicitly requested compile-time work still executes. A successful `check` returns status 0; diagnostics and requested compile-time output remain observable. Add `--timings` to see stage durations on `stderr`:

```sh
carven check --timings main.cv
```

## Saving and running later examples

Unless a lesson gives another filename, save each complete example as `main.cv`. Replace the previous example. Run `carven run main.cv`. If a chapter contains several complete programs, run them separately rather than joining them in one file or batch. File names must be valid identifiers: `main.cv` and `order_items.cv` work, `my-file.cv` does not.

A fragment that extends an earlier program says which declarations to keep. Multi-file examples list every file to pass to the compiler. The testing chapter introduces the separate commands for running tests; ordinary execution runs the application, not its tests.

Run each lesson from its exercise directory. Source paths are relative to that directory; the compiler repository is not required. Native compilation examples use `clang++`.

## Give the entry a name

Top-level statements suit short programs. When you want the entry to stand apart from reusable functions, name it `main` instead. Replace the whole file with:

```carven run
fn main() {
    let unit_price = 1200;
    let quantity = 3;
    println("Order total:", unit_price * quantity);
}
```

It prints the same output. `fn main()` declares the program entry; its braces contain the statements to execute. A module uses either top-level executable statements or `main` as its entry. Each executable selects one entry. The next chapters keep using top-level statements and add functions and types above them; later chapters use `main` where a named entry helps.

## Exercise

Change quantity from `3` to `4`; expect `Order total: 4800`. Then remove the string from `println`; expect only `4800`. Run `check`, `compile --stdout`, and direct execution, and confirm that only execution performs this print. Try the top-level and explicit-main versions as separate files, one at a time.
