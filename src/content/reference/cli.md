---
title: "Compiler commands and Graver"
description: "Native execution, interpretation, generated artifacts, and Graver source formatting."
section: reference
lesson: 18
source: docs/cli.md
---

## Commands

```sh
carven main.cv
carven main.cv -- argument
carven compile --stdout main.cv
carven compile -o generated main.cv
carven interpret --trace --max-steps 100000 main.cv
carven dump tokens main.cv
carven dump ast main.cv
```

`--help/-h`, `--version/-V`, and help for compile/interpret are available. No arguments prints top-level help and succeeds. Application sources are explicit; direct execution also collects fixed Crafts roots.

## Direct native execution

A source invocation analyzes and generates C++, invokes a native C++ toolchain to compile and link, then runs the program. It does not depend on Xmake or another build tool. Application sources remain explicit; the driver additionally collects `.cv` and `.cpp` files recursively from the matching toolchain's `crafts/carven/` and the working directory's optional `crafts/`. It does not search parent directories or follow imports to discover files, and does not recurse through directory symlinks. Identical physical files are deduplicated. All collected modules are analyzed, even when unused.

`CXX` selects one compiler executable name or path, defaulting to `clang++`; it is not split into shell arguments. The driver requests C++20, using MSVC-style arguments for `cl` and `clang-cl`, and GCC-style arguments for other drivers. The user supplies the required SDK, linker, and toolchain environment. The driver uses platform process interfaces to launch the toolchain and generated program.

For a standalone installation, place `bin/carven` (`bin/carven.exe` on Windows) and matching `crafts/carven/` under one installation root. A development binary can also locate Crafts in its enclosing source checkout. Header search includes the generated directory, toolchain and project Crafts directories, and the working directory.

Every run creates a separate `carven-run-*` directory under the system temporary directory for generated files and the native executable, without caching previous builds. It is removed after execution or a handled failure. Forced termination may leave it behind; cleanup failures produce a warning. Child processes inherit the working directory and standard streams, so relative file paths still resolve from the user's working directory.

Only source paths are accepted before `--`. Subsequent arguments are passed without a shell, including empty arguments, spaces, quotes, and backslashes. An entry is required; Carven diagnoses multiple entries first. Native compilation failures and program status are passed through; POSIX signal termination maps to `128 + signal`. External build systems handle complex native dependencies and incremental builds.

## Interpretation

Interpretation executes supported source operations directly with ordinary Carven semantics. Use native compilation for the full language and C++ integration. The interpreter subset does not restrict language-required compile-time evaluation, which has its own admission rules.

interpret analyzes only its explicit input batch, without automatically collecting Crafts. It performs semantic checks, executes required constants and const test, then checks the entry and its transitive direct callees against its execution subset. It supports integers, f32/f64, bool, char, str, String, supported structs/enums/fixed arrays, direct calls, local mutation, branches, loops, matching, and printing.

Without an entry, interpret completes semantic analysis, required constant evaluation, and const test, then exits successfully. It does not require a synthetic main for a declarations-only or static-test input batch.

Typed failures use the shared executor: throw, propagation, typed catches, guards, and rethrow work across ordinary calls. An escaping entry failure reports an execution error.

Executed code does not support C++ headers/fragments/operations, callables, Write parameters, slices, or entry argument values. Unused functions still receive ordinary language checks but need not fit the interpreter subset. The entry must be parameterless; arguments after `--` are ignored, as for a parameterless native entry.

Admission failures use `CV-INTERPRET-ADMISSION`, without falling back to native execution. Execution failures use `CV-INTERPRET-EXECUTION`; budget failures use `CV-INTERPRET-LIMIT`. Errors return 1 and normal completion returns 0. Completed output remains visible.

`--trace` writes interpreted statement locations, calls, and successful returns to stderr, indented by call depth. It does not trace preceding constant execution or every expression value. Program stderr shares that stream.

`--max-steps N` is a nonnegative decimal step count, defaulting to 100,000. Nested calls share the entry budget. It limits steps, not elapsed time or blocked output. Value size, call depth, aggregate work, and text work limits still apply. Each preceding constant root has an independent budget unaffected by this option. Options cannot repeat.

Ordinary interpreted calls do not require const fn. Runtime integer operations use the language's wrapping rules, including runtime calls to const fn; required constant arithmetic remains checked. Admission examines all branches of the entry and its transitive direct callees, even branches not selected during execution. Interpretation writes no C++ artifacts or native executable. Floating arithmetic uses the host native environment; floating printing and formatting follow native standard-library format rules.

## Input paths

Paths use UTF-8, `/` separators, and the `.cv` extension. Relative paths must not escape the working directory after lexical normalization. Removing the extension and joining components with dots produces the canonical module name. Absolute inputs are accepted only when their path contains a crafts hierarchy; the module name starts at the first crafts component. The operating system resolves symbolic links when opening a file.

Each component must have identifier shape; module components may be keywords. A batch cannot contain duplicate canonical module names. Imports resolve only these inputs.

## compile artifacts

| Option                                             | Behavior                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| No destination                                     | Write into the working directory                                 |
| `-o dir` / `--output-dir dir` / `--output-dir=dir` | Write into the specified directory                               |
| `--stdout`                                         | Print filename headings and content to stdout, with no file sink |

Select at most one destination option, without repetition. After successful analysis, files are written in canonical path order, parent directories are created, and existing files are overwritten. Writing stops at the first I/O failure; earlier files may already have been written. Stale-file cleanup, isolated output directories, and failure protection belong to the build system. stdout output is for inspection, not a single directly compilable C++ file.

Generated `.cpp` files retain source module paths. Internal headers use `carven/generated/<module-path>.hpp`; exported C++ interfaces use `carven/api/<module-path>.hpp`. These prefixes identify Carven headers to C++ consumers. With `-o generated`, `generated/carven/generated/…` therefore combines the selected output root with the header include path.

compile uses explicit inputs without automatically collecting Crafts, and does not invoke native compilation or linking. `--tests=default` and `--tests=external` are mutually exclusive and cannot repeat. They do not remove source main. Consumers choose which generated translation units form an application or test executable.

## Linkage domains

`--linkage-domain=value` requires the equals sign and a nonempty value, and may appear only once. It supplies caller-controlled identity for private generated namespaces. The default derives from the absolute normalized artifact root; stdout uses the working directory as a virtual root. Explicit and path-derived domains remain distinct even when their strings match.

Reuse a domain for the same logical target; use different domains for distinct targets that may link into one image. Moving the output root changes default identity. Source text, module membership and order, and source locations do not contribute to domain computation. A linkage domain neither changes Carven nominal identity nor defines a public C++ ABI.

## Diagnostics and compile-time output

Invocation, reading, source, or writing failures report to stderr and return nonzero. Warnings do not change successful compilation to a nonzero result. dump parses one file without semantic analysis, constant tests, or artifact generation. tokens prints tokens after successful lexing; ast prints the tree after successful parsing.

Required constant execution sends print/println to stdout and eprint/eprintln to stderr. With `compile --stdout`, all compile-time program output goes to stderr, leaving stdout for artifacts. Later compilation failures do not undo output. An incremental build reusing artifacts does not rerun or replay compile-time output.

## Graver

Graver is a separate source formatter, not a `carven` subcommand. Build it with `./xmakew build graver` from the Carven repository root; the commands below can also be invoked through `./xmakew run graver`.

| Command                     | Behavior                                                |
| --------------------------- | ------------------------------------------------------- |
| `graver [FILE or -]`        | Format one input to stdout; omitted input reads stdin   |
| `graver check FILE/DIR ...` | List paths needing formatting on stdout without writing |
| `graver check -`            | Check stdin; report a difference as `stdin`             |
| `graver write FILE/DIR ...` | Replace changed files silently                          |
| `graver help [COMMAND]`     | Show general or command-specific help                   |

`check` and `write` require inputs; use `.` for the current directory. Stdin must be used alone and cannot be written. Only the first argument recognizes command names. Use `./help`, `./check`, or `./write` for command-named files in default mode. There are no flags: dash-prefixed arguments, including `--help` and `--`, are literal paths.

Directory inputs recursively select `.cv` files, skipping nested hidden/build directories and symlink entries. Explicit files may have any extension. Paths are sorted and deduplicated; check reports use cwd-relative paths where possible. Explicit file symlinks can be read but are rejected by write.

Exit status is 0 for success, 1 for check differences, and 2 for an error. Diagnostics use stderr. All selected sources pass lexical and syntax validation before changes are reported or written. Each changed file is staged beside its destination, retains permission bits, and is compared against its original bytes before replacement. A later I/O failure can leave earlier files updated; the byte comparison does not lock files. Unchanged files are not rewritten.

The fixed style uses four-space indentation and a target width of 100 bytes. UTF-8 text may wrap early; indivisible tokens, comments, C++ fragments, and type-argument lists may exceed the target. Token and literal spelling, punctuation other than import-list trailing commas, comment text and token-gap position (allowing insertion or removal of those commas), interpolation text and specifications, and fenced C++ content are preserved; expressions inside interpolation holes are formatted. Authored blank-line counts remain, spaces on blank lines are removed, ordinary line endings become LF, and nonempty output ends in a newline. Output is re-lexed, compared with the input, and parsed before being returned.

Single-line import selections use one space inside each brace and omit the trailing comma, as in `using { Point, length }` and `using std::{ vector, allocator }`. Multiline selections put one name per line and include a trailing comma; an existing trailing comma alone does not force wrapping. The opening brace stays attached to `::`. These are formatting rules; the parser still accepts an optional trailing comma.

Formatting does not resolve imports, type-check programs, or execute compile-time functions and tests. Successful formatting establishes only the formatter's syntax and preservation checks.
