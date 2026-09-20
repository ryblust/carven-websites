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
carven --tests main.cv
carven check --timings main.cv
carven main.cv -- argument
carven compile --stdout main.cv
carven compile -o generated main.cv
carven interpret --trace --max-steps 100000 main.cv
carven interpret --tests main.cv
carven dump main.cv
carven dump tokens main.cv
carven dump ast main.cv
```

`--help/-h`, `--version/-V`, and command help for compile/check/interpret/dump are available. No arguments prints top-level help and succeeds.

## Source collection

`check`, `compile`, direct native execution, and `interpret` combine explicit application `.cv` inputs with `.cv` and `.cpp` files recursively collected from the matching toolchain's `crafts/carven/` and the working directory's optional `crafts/`. At least one explicit `.cv` input is required. Imports resolve within this batch; they do not discover or download files. Directory symlinks are not recursively followed. Files are deduplicated by canonical filesystem path and sorted by path spelling; distinct files with conflicting module identities are errors.

All collected `.cv` modules receive semantic checks, required constant evaluation, and static tests, even when unimported. Test mode selects all ordinary tests. Collected `examples/` and `tests/` subdirectories are included too. Installed library sources must build together and leave entry selection to the application. Keep independent examples, intentionally invalid tests, and alternative targets outside these roots.

For custom integration, keep external repositories in a directory such as `thirdparty/`, explicitly supply selected `.cv` inputs, and configure native sources, headers, defines, flags, and libraries in the external build. Official and third-party Crafts follow the same collection rules.

## Checking

`carven check main.cv` completes semantic analysis, including required constants, constant blocks, and `const test`, without generating artifacts or requiring an entry. Ordinary functions and runtime tests are checked but not executed. Native overloads, templates, and native type properties still require C++ compilation.

Success returns 0 and prints `carven: check passed` on stderr; invocation, input, or analysis errors return 1. Warnings do not change success status. `--timings` adds the duration to the success report without duplicating it.

## Timing reports

`--timings` is available for check, compile, interpret, dump, and native execution. It reports outcome, total wall time, and attempted stages on stderr, including failed commands. Analysis includes required constant execution and static tests; native runs also report C++ compilation and linking. Execution and artifact streams stay separate. Total time includes setup, diagnostics, and cleanup, so it can exceed the stage sum. Invalid options produce no timing report. `--` ends option parsing for native and interpreted runs.

## Direct native execution

A source invocation analyzes the collected batch, generates C++, compiles and links generated implementations together with collected `.cpp` files, then runs the program. It does not depend on Xmake or another build tool.

`CXX` selects one compiler executable name or path, defaulting to `clang++`; it is not split into shell arguments. The driver requests C++20, using MSVC-style arguments for `cl` and `clang-cl`, and GCC-style arguments for other drivers. The user supplies the required SDK, linker, and toolchain environment. The driver uses platform process interfaces to launch the toolchain and generated program.

For a standalone installation, place `bin/carven` (`bin/carven.exe` on Windows) and matching `crafts/carven/` under one installation root. A development binary can also locate Crafts in its enclosing source checkout. Header search includes the generated directory, toolchain and project Crafts directories, and the working directory.

Every run creates a separate `carven-run-*` directory under the system temporary directory for generated files and the native executable, without caching previous builds. It is removed after execution or a handled failure. Forced termination may leave it behind; cleanup failures produce a warning. Child processes inherit the working directory and standard streams, so relative file paths still resolve from the user's working directory.

Source paths, `--tests`, and `--timings` are accepted before `--`. Subsequent arguments are passed without a shell, including empty arguments, spaces, quotes, and backslashes. Program mode requires an entry; Carven diagnoses multiple entries first. Native compilation failures and program status are passed through; POSIX signal termination maps to `128 + signal`. External build systems handle complex native dependencies and incremental builds.

`carven --tests main.cv` runs ordinary runtime tests instead of the program entry and requires at least one runtime test. Static tests still run during analysis. Assertion failures produce a nonzero status; later tests continue. Top-level statements and `main` are not executed in test mode.

## Interpretation

Interpretation executes supported source operations directly with ordinary Carven semantics. Use native compilation for the full language and C++ integration. The interpreter subset does not restrict language-required compile-time evaluation, which has its own admission rules.

interpret uses the same source collection as check, compile, and native execution. It performs semantic checks, executes required constants and const test, then checks the entry and its transitive direct callees against its execution subset. It supports integers, f32/f64, bool, char, str, String, supported structs/enums/fixed arrays, direct calls, local mutation, branches, loops, matching, and printing.

Program execution requires an entry supplied by top-level executable statements or `main`. Use `check` for declaration-only, empty, or static-test-only files.

Typed failures use the shared executor: throw, propagation, typed catches, guards, and rethrow work across ordinary calls. An escaping entry failure reports an execution error.

The driver rejects collected `.cpp` files, and admission rejects C++ header imports and fragments in every collected module, including unimported modules. Executed bodies cannot use native operations, callables, Write parameters, slices, or entry argument values. Unused functions still receive ordinary language checks but need not fit the interpreter subset. The entry must be parameterless; arguments after `--` are ignored, as for a parameterless native entry.

Admission failures use `CV-INTERPRET-ADMISSION`, without falling back to native execution. Execution failures use `CV-INTERPRET-EXECUTION`; budget failures use `CV-INTERPRET-LIMIT`. Errors return 1 and normal completion returns 0. Completed output remains visible.

`--trace` writes interpreted statement locations, calls, and successful returns to stderr, indented by call depth. It does not trace preceding constant execution or every expression value. Program stderr shares that stream.

`--max-steps N` is a nonnegative decimal step count, defaulting to 100,000. Nested calls share the entry budget. It limits steps, not elapsed time or blocked output. Value size, call depth, aggregate work, and text work limits still apply. Each preceding constant root has an independent budget unaffected by this option. Options cannot repeat.

Ordinary interpreted calls do not require const fn. Runtime integer operations use the language's wrapping rules, including runtime calls to const fn; required constant arithmetic remains checked. Admission examines all branches of the entry and its transitive direct callees, even branches not selected during execution. Interpretation writes no C++ artifacts or native executable. Floating arithmetic uses the host native environment; floating printing and formatting follow native standard-library format rules.

`interpret --tests` requires at least one runtime test and skips the program entry. All selected tests and their transitive direct callees pass admission before any runtime test runs. Tests execute in canonical module order, then source order, each with fresh storage and an independent `--max-steps` budget. Ordinary helpers need not be const fn. Failed check operations accumulate; require/fail stop the current test through helper calls and cannot be caught as typed failures. Later tests continue after assertion failures, execution errors, or exhausted budgets. Failures and a pass/fail summary go to stderr; any failed test returns 1.

## Input paths

Paths use UTF-8, `/` separators, and the `.cv` extension. Relative paths must not escape the working directory after lexical normalization. Removing the extension and joining components with dots produces the canonical module name. Collected files derive module identity from their known Crafts root, independently of the installation prefix; explicit aliases retain that identity. Other absolute inputs require a crafts hierarchy and derive identity from its first crafts component. The operating system resolves symbolic links when opening a file.

Each component must have identifier shape; module components may be keywords. A batch cannot contain duplicate canonical module names. Imports resolve only these inputs.

## compile artifacts

| Option                                             | Behavior                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| No destination                                     | Write into the working directory                                 |
| `-o dir` / `--output-dir dir` / `--output-dir=dir` | Write into the specified directory                               |
| `--stdout`                                         | Print filename headings and content to stdout, with no file sink |

Select at most one destination option, without repetition. After successful analysis, files are written in canonical path order, parent directories are created, and existing files are overwritten. Writing stops at the first I/O failure; earlier files may already have been written. Stale-file cleanup, isolated output directories, and failure protection belong to the build system. stdout output is for inspection, not a single directly compilable C++ file.

Generated `.cpp` files retain source module paths. Internal headers use `carven/generated/<module-path>.hpp`; exported C++ interfaces use `carven/api/<module-path>.hpp`. These prefixes identify Carven headers to C++ consumers. With `-o generated`, `generated/carven/generated/…` therefore combines the selected output root with the header include path.

compile uses the shared source collector and does not invoke native compilation or linking. Test emission is omitted by default. `--tests` aliases `--tests=default`; this mode emits module tests, the runner, and a default test entry while suppressing the program entry wrapper, so all generated sources can link into one test executable. `--tests=external` emits tests and `carven/generated/carven-test-runner.hpp`, retains the program entry wrapper, and leaves entry selection and an optional reporter to the consumer. Modes and aliases cannot repeat or combine. Generation permits an empty test suite; commands that execute tests require at least one runtime test.

## Linkage domains

`--linkage-domain=value` requires the equals sign and a nonempty value, and may appear only once. It supplies caller-controlled identity for private generated namespaces. The default derives from the absolute normalized artifact root; stdout uses the working directory as a virtual root. Explicit and path-derived domains remain distinct even when their strings match.

Reuse a domain for the same logical target; use different domains for distinct targets that may link into one image. Moving the output root changes default identity. Source text, module membership and order, and source locations do not contribute to domain computation. A linkage domain neither changes Carven nominal identity nor defines a public C++ ABI.

## Diagnostics and compile-time output

Invocation, reading, source, or writing failures report to stderr and return nonzero. Warnings do not change successful compilation to a nonzero result. dump parses one file without semantic analysis, constant tests, or artifact generation. With no kind, dump prints tokens followed by the AST under `Tokens` and `AST` headings. tokens prints tokens after successful lexing; ast prints the tree after successful parsing. In combined mode, lexical errors stop parsing, while parsing errors leave printed tokens intact without an AST. `--timings` reports attempted loading, lexing, and parsing stages.

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
