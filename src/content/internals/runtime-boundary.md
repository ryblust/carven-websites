---
title: How generated programs connect to C++
description: Understand language runtime support, standard and user Crafts, native libraries, compilation, and linking.
section: internals
source: docs/compiler/README.md
---

## What supports the generated code

Carven generates C++ from checked semantics. Numbers, text, failure results, and callable objects in a generated program need native implementations. Shared facilities live in `crafts/carven/runtime/`. Standard and user Crafts organize library APIs, algorithms, and optional C++ implementation support.

<figure class="architecture-map">
  <div class="runtime-map">
    <div class="runtime-map-source"><strong>Carven programs · Standard & user Crafts</strong><span>.cv source modules</span></div>
    <div class="runtime-map-generated"><strong>Generated C++</strong><span>Interfaces, implementations, and required dependencies</span></div>
    <div class="runtime-map-dependencies"><div><strong>Language runtime</strong><span>Shared native operation support</span></div><div><strong>Native libraries & providers</strong><span>Existing C++ types and calls</span></div></div>
  </div>
  <figcaption>The native toolchain compiles generated files, Crafts’ .cpp support, and other required C++ sources, then links library dependencies.</figcaption>
</figure>

Compiler source does not include runtime headers. Backend symbol metadata describes the dependencies of generated code; artifacts include the corresponding headers. Runtime support provides language facilities. It does not depend on standard Crafts or solve source types, ownership, and failure contracts.

## Responsibilities at each layer

| Layer                       | Responsibility                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Compiler                    | Check semantics, perform admitted static execution, publish facts, and generate C++                                              |
| Language runtime            | Shared native support for numbers, arrays and slices, text and String, formatting, failure results, callables, checks, and tests |
| Standard Crafts             | Ordinary Carven modules organizing library APIs and algorithms, currently including UTF and SIMD helpers                         |
| User Crafts                 | Own their APIs and implementations under the same type, ownership, static-execution, and publication rules as standard Crafts    |
| C++ libraries and providers | Supply native types, functions, and implementations, with contracts for external objects and calls                               |
| Native build system         | Prepare sources, include paths, libraries, and options; compile, link, and manage incremental builds                             |

A library can enter through Craft declarations and native implementations, following ordinary semantic checking and generation, without becoming a compiler builtin.

## Explore generated code’s runtime interactions

<details class="architecture-detail">
<summary>Failure results: static sets, concrete native carriers</summary>

Semantic analysis computes failure sets and checks contracts after recovery. A fallible function uses a concrete `Outcome<Result, Failures...>` representation; a function unaffected by failures or test stop returns its result directly.

Internal callables admitting test stop also use a separate `TestStopped` transport, which is outside the declared failure set. Native export façades remove it; an escaping test stop terminates the program.

The current runtime’s `Outcome` storage uses `std::variant`. The backend arranges propagation, payload delivery, cleanup, and recovery branches. This container is an implementation detail. Source semantics preserve failure types, data, and evaluation behavior.

C++ exceptions do not automatically become Carven failures. An exception escaping generated functions or their corresponding bridges across a `noexcept` boundary terminates the program. A native adapter that needs recovery catches the exception and explicitly chooses a recovery value or failure result.

</details>

<details class="architecture-detail">
<summary>Reading and transfer: source permissions, native storage and passing</summary>

Carven checks Read, Write, and Take before selecting native passing according to storage properties. Read preserves array, String, and closure backing; pure Carven snapshot values can pass by value. C++ copy and destruction properties participate in representation choices for native-containing values. Write uses a mutable reference; Take receives an owned value and constructs it according to transfer policy.

Temporary storage in constant execution also has explicit completion rules. A constructed String can freeze into a canonical `str`. Slice elements become constant identities, and the backend creates module-owned constant array backing. Addresses in compiler host memory do not become target-program constant addresses directly.

These choices preserve source observation points and lifetimes. The validity of an external C++ pointer and a library’s retention of references still depend on the native boundary’s contract.

</details>

<details class="architecture-detail">
<summary>SIMD: logical lanes, target-selected implementation</summary>

Carven separates logical vector shape from a particular hardware register. Static execution handles owned lanes. Native execution selects NEON, explicitly consumer-enabled AVX2, or portable lanes during compilation.

A wide vector can use two NEON registers or one AVX2 register. The current implementation has no runtime dispatch; related translation units need consistent backend options. Benefits depend on the target machine and workload.

</details>

## Four different C++ entry points

| Entry         | Participation in generation and checking                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header import | Generate includes; explicit `using` introduces external names or namespace lookup. Carven does not parse headers, while C++ checks external names, members, templates, and conversions |
| `import(cpp)` | Declare a Carven capability implemented by a C++ provider; Carven neither emits its provider declaration nor compares its C++ signature                                                |
| `export(cpp)` | Generate an API header and façade for an ordinary Carven function in its module namespace under `carven::api`                                                                          |
| `#[cpp]`      | Place opaque C++ source in implementation artifacts, without publishing header declarations or wrapping generated Carven bodies                                                        |

Native calls retain C++ overload, template, and construction rules. Carven checks the access and lifetime relationships it knows. Unknown aliases, retention, reentry, and external lifetimes remain provider and caller contracts.

## From artifacts to an executable

`carven compile` writes generated interfaces and implementations, including collected Crafts module artifacts. It does not compile or copy collected native `.cpp` files. A manual build supplies those sources and dependencies to the C++ toolchain too.

When running `carven main.cv` directly, the driver compiles and links generated implementations with collected native sources, then executes the result. Generated programs and installed Crafts have a C++20 minimum baseline; consumers may select a newer standard. The host toolchain requirements for building the Carven compiler belong to a separate layer.

- The [C++ host example](/features/cpp-generation/#connect-to-an-existing-c-project) shows API headers and linking.
- The [C++ interoperation tutorial](/learn/interop/) starts with a third-party library call.
- The repository’s [interoperation rules](https://github.com/ryblust/carven/blob/main/docs/language/interop.md), [builds and artifacts](https://github.com/ryblust/carven/blob/main/docs/toolchain/artifacts.md), and [standard Crafts](https://github.com/ryblust/carven/blob/main/crafts/carven/std/README.md) describe further boundaries.
