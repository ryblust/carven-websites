---
title: "Let semantics shape the C++"
description: "Declare modules, access, and failure contracts; Carven arranges native interfaces, evaluation, storage, and cleanup."
section: cpp-generation
source: docs/backend.md
---

## From program meaning to native implementation

Carven is a programming language and compiler targeting C++. Source describes modules, types, access, ownership, and failure. The compiler checks those relationships and organizes the resulting semantics into a C++20 program.

**Source declares modules, access, and failure contracts; the compiler uses them to generate C++ interfaces and implementations.** The native compiler continues to handle C++ type requirements, object layout, optimization, and machine-code generation.

## One source for interface and implementation

When C++ is organized into headers and implementation files, even a small function may span two files:

```cpp
// answer.hpp
#pragma once
#include <cstdint>

std::int32_t answer();
```

```cpp
// answer.cpp
#include "answer.hpp"

namespace {
std::int32_t helper() {
    return 42;
}
}

std::int32_t answer() {
    return helper();
}
```

Carven expresses the same intent in one source file:

```carven
export(cpp) fn answer() -> i32 {
    return helper();
}

private fn helper() -> i32 {
    return 42;
}
```

The compiler establishes declaration identities before arranging definition dependencies. helper can appear after its use; the public entry and private implementation go into the appropriate artifacts. The C++ above illustrates handwritten organization. Carven's generated public entry additionally uses the module namespace.

Interface components follow dependencies that require complete definitions, with forward declarations where appropriate. Dependencies confined to function bodies stay in implementation files. Changing only a private function body can leave the generated headers unchanged when the interface and its dependencies remain unchanged.

**Visibility and type dependencies guide interface organization; the compiler maintains declaration synchronization and dependency order.**

## Generate order, storage, and cleanup together

Handwritten C++ requires temporaries, branches, and scopes to be arranged around its expression evaluation rules. Carven specifies left-to-right evaluation along the selected path, with each operand evaluated once. Generation arranges that order together with failure exits, borrowing lifetimes, and cleanup.

For example, an earlier aggregate component may already be constructed when a later component fails. The compiler must preserve the earlier value and end its lifetime on the failure path. When a successful result has a known destination, generation arranges direct construction without introducing an unnecessary default-construction requirement.

Generated local storage follows the accesses retained in the native program. Field and array projections carry their consumer's access back to the owner: reading a projection can keep const access, while writes and ownership transfers can require mutable storage. Source access rules remain enforced independently of the chosen C++ storage.

C++ can still reject an immovable native component that must first be saved and then transferred into an aggregate. Direct construction in the final destination has different requirements from intermediate storage across a failure boundary.

## Keep using known information at runtime

Generation continues to use checked facts:

| Known semantics                                    | Native work they can determine                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| Access and borrowing relationships                 | Parameter passing, retained storage, and cleanup scopes                 |
| Failure sets                                       | Concrete result carriers, propagation branches, and callable adaptation |
| The destination of a successful result             | Direct construction and necessary intermediate storage                  |
| Fixed format segments and supported builtin fields | Prepared text, direct field writes, and capacity bounds                 |
| Proven text encoding                               | A formatting path that needs no repeated UTF-8 scan                     |

**Static information also helps select the implementation.** Every path preserves required evaluation, side effects, ownership, and failure behavior. The C++ toolchain handles the remaining native optimizations.

## Connect to an existing C++ project

The artifacts are inspectable headers and implementation files that can be compiled and linked. C++ consumers include the generated public API header and link the corresponding implementation. The project continues to choose its native libraries, compiler options, and debugging tools.

Carven does not require a separate object-layout or machine-code backend for project providers. It completes semantic checking and source generation before the native build, with runtime support headers supplied by the toolchain.

C++ modules, templates, code generators, and library abstractions can also organize this work. Carven generates interfaces and implementations from the same checked module, type, access, and failure rules, reducing the work a project must do to keep those rules and implementations in sync.
