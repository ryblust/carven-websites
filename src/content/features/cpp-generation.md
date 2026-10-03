---
title: "Let semantics shape the C++"
description: "Declare modules, access, and failure contracts; Carven arranges native interfaces, evaluation, storage, and cleanup."
section: cpp-generation
source: docs/compiler/backend/README.md
---

## From program meaning to native implementation

Carven is a programming language and compiler targeting C++. Source describes modules, types, access, ownership, and failure. The compiler checks those relationships and organizes the resulting semantics into a C++20 program.

The generated C++ contains the corresponding interfaces and implementations. The C++ compiler then checks native type requirements, determines object layout, optimizes the program, and generates machine code.

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
export(cpp) fn answer() -> i32 => helper();

private fn helper() -> i32 => 42;
```

The compiler identifies declarations before ordering their definitions by dependency. This lets `helper` appear after the function that calls it; the public entry and private implementation go into the appropriate generated files. The C++ above illustrates handwritten organization. Saved as `answer.cv`, the Carven version generates this public API header (excerpt of `carven compile --stdout answer.cv`):

```cpp
// carven/api/answer.hpp
#pragma once

#include <cstdint>

#include <carven/generated/answer.hpp>

namespace carven::api::answer {

auto answer() noexcept -> ::std::int32_t;

} // namespace carven::api::answer
```

The public function lives in a namespace derived from the module and forwards to the checked implementation in a private generated namespace. helper stays in an anonymous namespace inside `answer.cpp`, and `#line` directives in that file point back to `answer.cv`.

Interface components follow dependencies that require complete definitions, with forward declarations where appropriate. Dependencies confined to function bodies stay in implementation files. Changing only a private function body can leave the generated headers unchanged when the interface and its dependencies remain unchanged.

**Visibility and type dependencies guide interface organization; the compiler maintains declaration synchronization and dependency order.**

## Generate order, storage, and cleanup together

Handwritten C++ requires temporaries, branches, and scopes to be arranged around its expression evaluation rules. Carven specifies left-to-right evaluation along the selected path, with each operand evaluated once. Generation arranges that order together with failure exits, borrowing lifetimes, and cleanup.

For example, an earlier aggregate component may already be constructed when a later component fails. The compiler must preserve the earlier value and end its lifetime on the failure path. When a successful result has a known destination, generation arranges direct construction without introducing an unnecessary default-construction requirement.

Generated local storage follows the accesses retained in the native program. Field and array projections carry their consumer's access back to the owner: reading a projection can keep `const` access, while writes and ownership transfers can require mutable storage. Source access rules remain enforced independently of the chosen C++ storage.

Classes follow the same approach. A Carven `class` is an encapsulated value with no hidden heap allocation, inheritance, or virtual dispatch. Generated C++ represents it as a struct holding its fields, and its operations as ordinary functions: a `&self` receiver becomes a mutable reference parameter. Read `self` follows the same policy as other Read parameters: classes containing Carven arrays, `String`, or closures preserve that storage through const references; a pure scalar class can pass by const value. Native value components use C++ copy and destruction traits to select the representation.

C++ can still reject an immovable native component that must first be saved and then transferred into an aggregate. Direct construction in the final destination has different requirements from intermediate storage across a failure boundary.

Plain assignment uses the destination's C++ assignment operation and preserves its lifetime. Take changes Carven source availability; native delivery can use a trivial copy or an rvalue, with C++ selecting the constructor. A returned named owner is copied unless source explicitly requests Take. These rules preserve effects while avoiding an extra owner merely to forward a value.

Known scalar values can also preserve native constant-expression narrowing in braced construction. Required operand effects still execute. C string literals reach native calls as `const char*`, so C++ overload resolution and template deduction see that pointer type.

Only private functions and closures requested by native entries and their dependencies receive native definitions. A function used solely during static execution need not have a runtime body in the artifacts. Static-parameter calls place shared inline instances in the caller's implementation under the provider's namespace; adding a new static input changes the caller's artifact without making provider output depend on its callers.

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

A scalar binding that cannot change or expose writable storage can be read directly without another operand snapshot. Writable addresses, Write captures, assignment, and Take prevent that assumption. Slice elements still read their backing even when the slice descriptor is stable.

Pattern coverage can remove a selection test already proved by earlier unguarded arms, while preserving dynamic bound evaluation, guards, and any tests needed to choose different binding sources. A single failure handoff can invoke its handler directly when payload snapshots, cleanup, and loop boundaries permit it. Multiple failure paths or observable cleanup retain the storage that joins those paths. Native payload copies, moves, addresses, and destruction remain observable.

## Connect to an existing C++ project

The artifacts are inspectable headers and implementation files that can be compiled and linked. C++ consumers include the generated public API header and link the corresponding implementation. The project continues to choose its native libraries, compiler options, and debugging tools.

`carven compile --stdout answer.cv` displays only the artifacts of the explicit inputs, each under a `==> logical/path <==` heading; collected Crafts still take part in analysis. It is an inspection format. To build, write the files to a directory and compile them. A small C++ host:

```cpp
// host.cpp
#include <carven/api/answer.hpp>
#include <cstdio>

int main() {
    std::printf("%d\n", carven::api::answer::answer());
}
```

```sh
carven compile -o out answer.cv
clang++ -std=c++20 -Iout -I/path/to/carven/crafts \
    host.cpp out/answer.cpp out/crafts/carven/std/utf/*.cpp \
    out/crafts/carven/std/simd/*.cpp -o host
./host
```

The program prints `42`. Every command collects the bundled Crafts, so the output also contains generated implementations for the UTF and SIMD Crafts under `out/crafts/carven/std/utf/` and `out/crafts/carven/std/simd/`; a manual build compiles them with the application sources. Replace `/path/to/carven/crafts` with the `crafts/` directory installed beside the toolchain. An Xmake rule can take over these steps; see the [toolchain reference](/reference/toolchain/).

Carven does not require a separate object-layout or machine-code backend for project providers. It completes semantic checking and source generation before the native build, with runtime support headers supplied by the toolchain.

C++ modules, templates, code generators, and library abstractions can also organize this work. Carven generates interfaces and implementations from the same checked module, type, access, and failure rules, reducing the work a project must do to keep those rules and implementations in sync.
