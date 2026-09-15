---
title: "Command line and execution modes"
description: "Native execution, compile, interpret, input mapping, test artifacts, and process status."
section: reference
lesson: 17
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

`--help/-h`, `--version/-V`, and help for compile/interpret are available. No arguments prints top-level help and succeeds. Source paths always identify an explicit input batch.

## Direct native execution

Invoking Carven with source paths analyzes and generates C++, invokes the native compiler to compile and link, then runs the program. This currently supports POSIX. CXX selects one compiler executable name or path, defaulting to clang++; its value is not split into shell arguments. The driver requests C++20 and adds the working directory to native header search paths.

The tool finds Crafts beside an installed binary or in the source tree containing the development binary. Generated files and the executable live in a temporary directory, cleaned up after execution or a handled failure. Child processes inherit the working directory and standard streams.

Only source paths are accepted before `--`. Everything after it is passed unchanged to the program, including text resembling options. An entry is required; Carven diagnoses multiple entries first. Native compilation failures and program status are passed through. Signal termination maps to `128 + signal`.

## Interpretation

interpret uses the same input batch and semantic checks, executes required constants and const test, then checks the entry and its transitive direct callees against its execution subset. It supports integers, bool, char, str, String, supported structs/fixed arrays, direct calls, local mutation, branches, loops, matching, and printing.

Executed code does not support C++ headers/fragments/operations, floating-point operations, callables, typed failures, Write parameters, slices, or entry argument values. Unused functions still receive ordinary language checks but need not fit the interpreter subset. The entry must currently be parameterless; arguments after `--` are ignored, as for a parameterless native entry.

Admission failures use `CV-INTERPRET-ADMISSION`, without falling back to native execution. Execution failures use `CV-INTERPRET-EXECUTION`; budget failures use `CV-INTERPRET-LIMIT`. Errors return 1 and normal completion returns 0. Completed output remains visible.

`--trace` writes interpreted statement locations, calls, and successful returns to stderr, indented by call depth. It does not trace preceding constant execution or every expression value. Program stderr shares that stream.

`--max-steps N` is a nonnegative decimal step count, defaulting to 100,000. Nested calls share the entry budget. It limits steps, not elapsed time or blocked output. Value size, call depth, aggregate work, and text work limits still apply. Each preceding constant root has an independent budget unaffected by this option. Options cannot repeat.

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

compile does not invoke native compilation or linking. `--tests=default` and `--tests=external` are mutually exclusive and cannot repeat. They do not remove source main. Consumers choose which generated translation units form an application or test executable.

## Linkage domains

`--linkage-domain=value` requires the equals sign and a nonempty value, and may appear only once. It supplies caller-controlled identity for private generated namespaces. The default derives from the absolute normalized artifact root; stdout uses the working directory as a virtual root. Explicit and path-derived domains remain distinct even when their strings match.

Reuse a domain for the same logical target; use different domains for distinct targets that may link into one image. Moving the output root changes default identity. Source text, module membership and order, and source locations do not contribute to domain computation. A linkage domain neither changes Carven nominal identity nor defines a public C++ ABI.

## Diagnostics and compile-time output

Invocation, reading, source, or writing failures report to stderr and return nonzero. Warnings do not change successful compilation to a nonzero result. dump parses one file without semantic analysis, constant tests, or artifact generation. tokens prints tokens after successful lexing; ast prints the tree after successful parsing.

Required constant execution sends print/println to stdout and eprint/eprintln to stderr. With `compile --stdout`, all compile-time program output goes to stderr, leaving stdout for artifacts. Later compilation failures do not undo output. An incremental build reusing artifacts does not rerun or replay compile-time output.
