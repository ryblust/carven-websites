---
title: "Start with a piece of C++ logic"
description: "Explore explicit access, ownership, and failure contracts within a familiar native project."
section: use-cases
source: README.md
---

Carven translates `.cv` source files into C++ for a native toolchain to compile and link. Start with a small module whose boundaries are easy to verify, and explore how the language expresses that logic.

The following scenarios draw on examples already present in the repository. They are starting points for understanding and trying current capabilities. Carven is under active development; language and toolchain changes may be incompatible.

## Integrate one module at a time

Suppose a C++ application needs to calculate a quantity discount. Write the calculation in Carven and expose a native interface with `export(cpp)`.

```carven
export(cpp) fn price_cents(quantity: i32) -> i32 {
    let unit_price: i32 = if quantity >= 10 { 90 } else { 100 };
    return quantity * unit_price;
}
```

The program entry remains in C++. The build generates a public header and an implementation; C++ includes the header and links the implementation. This example assumes small, nonnegative quantities. The calculation itself does not validate arbitrary input or handle integer overflow.

The current explicit `import(cpp)` and `export(cpp)` boundaries support scalar signatures without Carven failures. Scope and naming follow the native interoperation rules.

**A useful starting point:** calculation rules, small modules with clear boundaries, and experiments checked alongside existing C++ tests.

## Reuse native libraries

Header imports make C++ types and functions available in Carven.

```carven
import <vector> using std::vector;

fn count() -> usize {
    var values = vector<i32> { 1, 2, 3 };
    values.push_back(4);
    return values.size();
}
```

C++ checks native declarations, members, overloads, and conversions. Carven continues to check its access and ownership contracts. The native build supplies header search paths, libraries, and compiler options.

The repository's native parser example shows a fuller boundary: a C++ adapter calls `std::stoi` and handles expected exceptions, then Carven interprets the native result as its own success or failure value.

**A useful starting point:** existing utility functions, native containers, or a narrowly scoped adapter for a dependency.

## Express recoverable business failures

An order quote may fail because a quantity is invalid, stock is insufficient, or delivery is unavailable. Separate failure types let callers respond to their business meaning while retaining the relevant data.

Carven's quote example combines stock and delivery logic, tries an alternative for one delivery failure, and preserves other failures with their original data. The configuration example demonstrates validation and fallback. The callback example lets callers introduce additional failure conditions.

Private functions can infer failures introduced by composition. Published boundaries declare the allowed set. Callers propagate at a suitable expression boundary and use pattern arms to recover or pass failures outward.

**A useful starting point:** configuration validation, composed rules, recoverable parsing workflows, and callback interfaces with explicit failure boundaries.

Each example has a defined scope. The quote example does not actually deduct stock or initiate payment; the configuration example does not read files or environment variables. They focus on how contracts flow between functions.

## Reduce C++ interface maintenance

For logic involving several types and mutually calling functions, maintain their definitions in `.cv` source. The compiler generates interfaces and implementations from visibility and type dependencies, arranging forward declarations and definition order. Dependencies used only in function bodies do not merge interfaces.

**A useful starting point:** modules that benefit from less manual synchronization of declarations and implementations, with a generated public interface for C++ consumers.

## Choose a scope you can verify

Carven currently fits learning, language exploration, and controlled integration experiments. For an evaluation, use the same revision of the compiler, support headers, documentation, and examples, and verify the capabilities your target project actually needs.

The toolchain has separate host and target requirements: building the compiler requires a toolchain with C++26 support; generated programs and support libraries use C++20. The compiler host currently validated by the repository is LLVM/Clang with libc++ 23.1.0.
