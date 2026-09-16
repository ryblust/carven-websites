---
title: "Builds, artifacts, and native integration"
description: "Host requirements, C++20 targets, Xmake batches, generated interfaces, and runtime support."
section: reference
lesson: 19
source: docs/toolchain.md
---

## Host and target

The Carven compiler uses C++26 with exceptions and RTTI disabled. The currently validated host is LLVM/Clang with libc++ 23.1.0. Generated programs and installed Crafts require at least C++20. The consumer project selects its standard, and runtime feature detection uses available facilities. Host requirements do not raise the target minimum.

Native consumers select exception support according to provider requirements. A cpp fragment containing C++ throw/try/catch requires exceptions in its translation unit. Host and target must use the same isize/usize data model; f32/f64 require IEEE binary32/64. Native options must preserve equality and evaluation semantics.

## Build responsibilities

Delivery requires Carven analysis, C++ compilation, and linking. The build system supplies the complete source batch, native include paths, providers, libraries, and compiler options. `carven compile` writes artifacts; direct source execution additionally performs local native compilation and execution.

C++ checks delegated declarations, overloads, templates, conversions, construction, and linking. Generated diagnostics use source mapping. Earlier native aggregate components retained across a later failure may need copying or moving. An immovable component can fail native compilation even when direct construction at its final destination remains possible.

## Xmake consumer projects

```text
add_repositories("carven-xmake-repo https://github.com/ryblust/carven-xmake-repo.git")
add_requires("carven")

target("app")
    set_kind("binary")
    add_rules("@carven/carven")
    add_files("src/**.cv")
```

The rule obtains matching compiler and Crafts packages, uses installed crafts/carven and project crafts as source roots, and adds both native include roots. A missing project crafts directory contributes no files. Applications list their own sources; native dependencies use ordinary target configuration. Test targets explicitly add sources under tests and select test output mode.

Before native dependency scanning, the rule supplies the complete .cv batch, uses target-private output roots and linkage domains, and registers generated .cpp files. Installed sources retain the crafts/carven hierarchy. `std::` selects the official standard library; an import does not download a package or add a link library.

Generation first writes to staging, then promotes artifacts to live output. Compiler invocation failure preserves live artifacts; promotion itself can partially fail. The rule repository owns batch assembly, incremental promotion, and recovery.

## Artifact paths

```text
carven/generated/<component-anchor>.hpp
carven/api/<canonical-module-path>.hpp
<canonical-module-path>.cpp
carven/generated/carven-test-runner.hpp
carven/generated/carven-test-main.cpp
```

Declarations connected by complete-definition dependencies form interface components. The anchor is the first canonical module name in the component; a module without a published surface owns no component header. Implementations use canonical module paths. Logical artifact paths are relative to the output root.

export(cpp) appears in self-contained `carven/api` headers under `carven::api`, followed by encoded module namespaces. The corresponding façade is in the implementation. C++ header imports enter required artifacts in their original module order. External interface types need the complete header environment of their context module. Delimiters and repeated includes are preserved; cross-module ordering is stable, without reproducing arbitrary macro-configuration order. cpp fragments appear after implementation includes and before the generated namespace.

Default test output includes the runner and main; external mode includes only the runner. Runtime tests run in canonical module-path order and source order within a module. Installation, stale-artifact cleanup, and native scheduling belong to the build system.

## Runtime support

The installed layout places crafts beside bin. Generated code includes runtime leaf headers as needed: passing, numeric, array, slice, text, utf, string, format, writer, print, entry, deferred, outcome, callable, unreachable, and testing. runtime.hpp collects them.

The compiler and support headers must match. Private generated names, helper selection, and representation layout are implementation details. General interpolation requires C++20 format support. Printing may use a C++23 implementation through feature detection without changing the consumer's selected standard.

Direct native calls to String::from_str/append require valid UTF-8; push requires a valid scalar. from_utf8 checks bytes and terminates on invalid input. These native runtime APIs have separate contracts from standard-library validation APIs that return typed failures.
