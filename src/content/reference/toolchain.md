---
title: "Build and native integration"
description: "Host requirements, C++20 targets, Xmake batches, generated interfaces, and runtime support."
section: reference
lesson: 24
source: docs/toolchain/artifacts.md
---

A native Carven program is built in three steps: Carven checks the source and generates C++, a C++ compiler builds those files, and a linker combines them with runtime support and native libraries. Xmake coordinates these steps for project builds. This page describes the files and version requirements needed when configuring that build.

## Host and target

Compiler implementation uses C++26 with exceptions and RTTI disabled. It uses
LLVM/Clang and libc++ across platforms, supplied by LLVM-MinGW on Windows.
LLVM 23 is the validated toolchain version. Generated programs and installed
crafts have a C++20 minimum baseline. The consumer project selects its C++
standard. Generated code and runtime support select newer facilities through
feature detection while preserving the operation's behavior.
Compiler-host features do not raise the generated-program or installed-craft
baseline.

The native consumer build selects exception support for its sources and
providers according to their C++ requirements. A `#[cpp]` fragment containing
native `throw` or `try`/`catch` requires exception support in its generated
translation unit.

A successful build requires Carven analysis, native compilation, and linking.
Carven supplies C++ and artifact metadata; the native compiler checks provider
contracts, definitions, overloads, templates, and delegated conversions. Generated
source mappings attribute C++ diagnostics to their Carven locations. Native checks
can fail after Carven analysis succeeds. Check the native compiler's diagnostics for missing providers, headers, unsupported construction, or required libraries.

### Construction limitation

Native aggregate construction can require copying or moving saved components. See [C++ construction and conversions](/reference/interop/#types-construction-and-conversions) for immovable-result restrictions.

## Numeric model

Carven `isize` and `usize` use the host's pointer-sized integer widths during
analysis and matching target types at runtime. Host and target data models must
match. `f32` and `f64` require IEEE 754 binary32 and binary64; runtime headers
check the target properties. Native options must preserve IEEE equality and
Carven evaluation order.

## Artifact paths

`check -o <dir>` writes retained semantic IR and `carven/manifest.json`. `compile` writes
C++ and its manifest. Each manifest indexes that operation's output artifacts.
Supplying an analysis directory to `compile` generates C++ from its published
program, including test generation, without repeating source analysis or static execution.
A standard-library artifact directory can supply checked definitions to a new
source batch. The consuming analysis constructs its new generic and static
instances. The build system owns dependency freshness.

C++ artifact paths are:

```text
carven/manifest.json
carven/generated/<linkage-domain>/<component-anchor>.hpp
carven/api/<canonical-module-path>.hpp
carven/providers/<canonical-module-path>.hpp
<canonical-module-path>.cpp
carven/generated/carven-test-runner.hpp
carven/generated/carven-test-main.cpp
```

An interface component contains declarations connected by complete-definition
requirements. Its anchor is its first canonical module path. Modules without a
published semantic surface have no component of their own. Implementations use
canonical module paths. An implementation emits the static instances its module calls as `inline`
functions in the provider's namespace. New static arguments change the caller's
implementation; provider artifacts remain independent of their callers.

The `carven/api` header contains explicit `export(cpp)` declarations in
`carven::api`, followed by nested namespaces for the encoded module path
components. Its implementation contains the corresponding façades. The header
is self-contained.

Modules containing concrete `import(cpp)` declarations produce a
`carven/providers` header with signature type aliases and complete type
dependencies. Native authors include it when naming Carven representations;
function declarations remain in authored C++ headers or source fragments.

C++ header imports become ordered includes in the owning implementation. An
external type or result query needed by an interface brings its context module's
complete header import list into that interface, including imports without
`using`. Module-scoped lookup additionally brings the complete using environment.
Each artifact materializes a module environment once, preserving that module's
import order, delimiter forms, and explicit repetitions. Different environments
follow canonical module-path order. Native headers must work in that order;
cross-module macro configuration order is not preserved. Raw source fragments remain
implementation-only and follow includes at global scope before generated namespaces.

Generated implementations include their associated interface component first,
when one exists. Generated test entries include their runner header first. Native
header environments follow, then runtime headers, other generated interfaces,
and directly required standard-library headers. Compiler-generated dependencies
are merged and sorted within their groups; explicit native occurrences remain
independent and retain their repetitions. Generated headers begin with pragma-once.

[CLI test emission](/reference/cli/#test-emission) selects the generated entry or a runner for a caller-provided entry. Test execution and reporting follow [entries and tests](/reference/entry-testing/).

Project linkage identity combines the generation destination, canonical module
path, and test generation mode. Generated interface paths carry the same linkage
domain as their declarations. Each application target owns its application
generation destination; changing its source membership does not change that
destination. Installed standard-library modules retain their compiler-defined
linkage identity; the Xmake rule shares their generated text in a separate
destination.

Public `export(cpp)` names belong to the program-wide `carven::api` namespace.
Give separately linked public modules distinct canonical paths. Reuse one library
target through native dependencies when multiple consumers need the same definitions.

Logical paths are relative to the output destination. The build system owns
stale artifact removal, installation, and native dependency scheduling.
The manifest projects the compilation result as JSON:

| Field                | Meaning                                                                               |
| -------------------- | ------------------------------------------------------------------------------------- |
| `workspace.root`     | Invocation working directory                                                          |
| `inputs`             | Source paths, canonical module identities, ownership, and standard-library membership |
| `artifacts`          | Relative output paths, roles, source mapping, and implementation source ownership     |
| `runtime_test_count` | Runtime inline tests in owned modules, independently of emission mode                 |
| `cacheable`          | Whether analysis completed without observing host input, time, or waiting             |

Input paths within the workspace are relative; external paths are absolute.
Artifact roles are `interface`, `cpp-api-header`, `module-implementation`,
`test-runner-header`, `test-entry`, and `semantic-ir`. Source mapping is
`stable-interface` or `source-attributed`. Synthetic outputs have no source owner.
Native compiler dependency files establish C++ header dependencies.

## Build responsibilities

The `compile` command collects fixed Crafts roots and writes generated artifacts;
it does not compile or copy collected `.cpp` sources. A manual native build
selects the generated implementations and C++ providers needed by its target,
including any required native initialization. A program using only header-based
runtime operations needs its own generated implementation and runtime headers.
The direct-run entry compiles all generated implementations and collected native
sources in a temporary directory. For project builds, supply the output root and
installed support root as include paths, plus required native sources and
libraries. Header imports add neither include directories nor link inputs.

Xmake is the default project build system. Use Xmake 3.1.1 or later and a
C++20-capable toolchain. Declare the package and attach its rule to the application:

```lua
add_repositories("carven-xmake-repo https://github.com/ryblust/carven-xmake-repo.git")
add_requires("carven")

target("app")
    set_kind("binary")
    add_rules("@carven/carven")
    add_files("src/**.cv")
```

```shell
xmake build
xmake run app
xmake test
```

`xmake test` can also be the first build command. The rule discovers runtime
inline tests in the selected source sets and registers nonempty test programs.
Empty results add no test record or native test build.
Ordinary application builds retain their entry and omit runtime test code.

Declare an explicit test target to choose its sources, native settings, or entry.
For an application with an authored C++ entry, exclude that entry from the test
program and disable the application's automatic inline-test target:

```lua
target("app")
    set_kind("binary")
    add_rules("@carven/carven", {tests = false})
    add_files("src/*.cv", "src/*.cpp")

target("app-tests")
    set_default(false)
    set_kind("binary")
    add_rules("@carven/carven", {tests = true})
    add_files("src/*.cv", "src/*.cpp")
    remove_files("src/main.cpp")
    add_tests("default")
```

```shell
xmake build app-tests
xmake test 'app-tests/*'
```

`tests = true` generates the test program's entry. The compiler replaces a Carven
application entry while retaining the source's declarations and inline tests;
keep that `.cv` file in the test target. Xmake's `remove_files` excludes an authored
C++ entry when the generated test entry replaces it. Use
`tests = {entry = false}` to emit inline tests and their runner for an authored
entry to call. Register explicit test executions with `add_tests`; test names and
execution hooks do not select compiler generation modes.

The package supplies the compiler and matching `crafts/carven/`. The rule also
collects project-root `crafts/` when present and supplies both Crafts roots as
native include paths. Target sources use project-relative module paths with the
`.cv` suffix removed. Each component must match `[A-Za-z_][A-Za-z0-9_]*`.
Configure native providers through ordinary target settings and dependencies.

Xmake owns target dependencies, native configuration, preparation order, header
scanning, compilation, linking, and concurrency. The Carven rule supplies generated
sources and preserves the native settings attached to their originating `.cv`
files. The rule processes the full installed standard library and registers its
generated implementations and installed native support sources on each consumer
target. Xmake compiles these sources with that target's native settings and manages
incremental builds. Native artifact reuse follows Xmake's own requirements.

Identical source batches share checked programs. Each application target generates
its application C++ and selected entry in its own output directory. Within one configured Xmake project,
targets using the same Carven compiler and installed sources share standard-library
analysis results and generated C++ text. The standard library keeps its fixed
generated symbol identity across those targets. Analysis with host input, clock
sampling, or waiting runs again on the next build request.

Shared generated text does not deduplicate native definitions at link time.
Components exchanging generated types must use compatible native ABI settings.
Runtime state sharing follows C++ definition and platform symbol-binding rules;
separately linked libraries are not guaranteed to share one runtime instance.

Generate into staging, publish only after a successful compiler invocation, and
preserve timestamps for unchanged output bytes. Xmake dependency records track
compiler, source, dependency artifacts, invocation arguments, and outputs.
Reconfigure after adding or removing installed Crafts files.

The installed layout places `crafts/` beside `bin/`. Runtime headers and native
sources remain with their owning capability. The rule supplies the standard TCP
provider's Winsock dependency on Windows; manual builds link `ws2_32`.

## Runtime support

Include the self-contained support headers for the contracts used by generated
files and native consumers. Runtime support is grouped by domain:

```text
carven/runtime/call/callable.hpp
carven/runtime/call/passing.hpp
carven/runtime/collection/array.hpp
carven/runtime/collection/range.hpp
carven/runtime/collection/slice.hpp
carven/runtime/collection/vector.hpp
carven/runtime/diagnostics/observe.hpp
carven/runtime/diagnostics/report.hpp
carven/runtime/diagnostics/trap.hpp
carven/runtime/display/display.hpp
carven/runtime/execution/child.hpp
carven/runtime/execution/clock.hpp
carven/runtime/execution/completion.hpp
carven/runtime/execution/composition.hpp
carven/runtime/execution/entry.hpp
carven/runtime/execution/execution.hpp
carven/runtime/execution/time.hpp
carven/runtime/execution/timeout.hpp
carven/runtime/execution/unreachable.hpp
carven/runtime/format/format.hpp
carven/runtime/format/writer.hpp
carven/runtime/io/cursor.hpp
carven/runtime/io/print.hpp
carven/runtime/io/queue.hpp
carven/runtime/io/stdin.hpp
carven/runtime/numeric/float.hpp
carven/runtime/numeric/numeric.hpp
carven/runtime/numeric/parse.hpp
carven/runtime/simd/simd.hpp
carven/runtime/testing/testing.hpp
carven/runtime/text/text.hpp
carven/runtime/text/utf8.hpp
carven/runtime/value/deferred.hpp
carven/runtime/value/outcome.hpp
carven/runtime/value/stateless.hpp
carven/runtime/value/tuple.hpp
carven/runtime/value/void.hpp
```

Each header includes its own dependencies. Generated files select the header that owns each runtime symbol. Native asynchronous implementations use the [provider and host contract](/reference/async/#native-providers-and-hosts).

Use support headers matching the compiler that generated the artifacts.
Private target names, helper selections, and representation layouts are
implementation details.

`call/passing.hpp` supplies native parameter and transfer support;
`execution/entry.hpp` supplies process arguments and entry failure reporting.
`diagnostics/trap.hpp` supplies source-positioned termination for violated runtime
checks.
`testing/testing.hpp` supplies inline-test execution contexts, failure records,
and reporting in `carven::runtime`.

`text/text.hpp` supplies owning String, borrowed text views, UTF-8 validation,
scalar encoding and decoding, and native representation conversions. Its
implementation headers are `string.hpp`, `view.hpp`, and `utf8.hpp`.
`format/format.hpp` supplies interpolation and requires C++20 `<format>` support; `format/writer.hpp` provides FormatWriter. `display/display.hpp` supplies structural display. `io/print.hpp` uses C++20 support or available C++23 print facilities under the consumer's selected standard. Source behavior is defined by [formatting and output](/reference/formatting/).

For direct C++ calls, `String::from_str` and `append` require valid UTF-8, and
`push` requires a Unicode scalar. `String::from_utf8` validates incoming byte
storage and terminates on invalid UTF-8. Runtime String operations support C++20
constant evaluation. Retained Carven String and Vector constants use immutable
backing and native constexpr descriptors. Read uses do not allocate; runtime
copies construct independent owners.

## SIMD configuration

The C++20 runtime selects one SIMD backend per translation unit: AArch64 NEON
when available, x86 AVX2 when enabled by the consumer, and otherwise the portable
backend. All backends implement the same logical lane operations.

Consumers select target instruction flags. An x86 consumer enables AVX2 with
`-mavx2`, `/arch:AVX2`, or Xmake's `add_vectorexts("avx2")`.
`CARVEN_SIMD_FORCE_PORTABLE` selects the portable backend. Translation units
sharing SIMD or runtime text types and inline definitions must select the same
backend. Independent programs can select different backends.

Runtime vector and mask types live in backend-specific inline namespaces within
`carven::runtime::simd`. Their type identities can expose backend mismatches in
symbols that encode those types. Return types alone and enclosing structs may
not expose a mismatch at link time.
