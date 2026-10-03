---
title: "Start with a piece of C++ logic"
description: "Explore explicit access, ownership, and failure contracts within a familiar native project."
section: use-cases
source: README.md
---

Carven translates `.cv` source files into C++ for a native toolchain to compile and link. Start with a module that has one clear responsibility and is easy to test, then try implementing it in Carven.

The following scenarios draw on examples already present in the repository. They are starting points for understanding and trying current capabilities. Carven is under active development; language and toolchain changes may be incompatible.

## Integrate one module at a time

Suppose a C++ application needs to calculate a quantity discount. Write the calculation in Carven and expose a native interface with `export(cpp)`.

```carven
export(cpp) fn price_cents(quantity: i32) -> i32 {
    assert(quantity >= 0, "quantity must be nonnegative");
    let unit_price: i32 = if quantity >= 10 { 90 } else { 100 };
    return quantity * unit_price;
}
```

The program entry remains in C++. The build generates a public header declaring `carven::api::pricing::price_cents` and an implementation; C++ includes the header and links the implementation together with the generated UTF and SIMD Craft sources. A negative quantity is a caller bug here, so `assert` reports the condition and message to stderr and aborts the process, whatever the native build's `NDEBUG` setting. It is not a recoverable failure; a caller that needs to handle bad input should receive a typed failure instead. The calculation does not guard against integer overflow; large quantities wrap.

Explicit `import(cpp)` and `export(cpp)` boundaries use ordinary Carven types, Read/Write/Take access, and declared failure contracts. Scope and naming follow the native interoperation rules.

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

Each example has a defined scope. The quote example does not actually deduct stock or initiate payment; the configuration example does not read files or environment variables. They show how functions declare possible failures and how callers handle or propagate them.

## Reduce C++ interface maintenance

A class groups state with the methods that provide access to it. Only the class body can read its fields or construct it, and it stays a plain value: no heap allocation, inheritance, or virtual dispatch.

```carven
class Cart {
    count: i32,
    total_cents: i32,
    fn empty() -> Cart => { count: 0, total_cents: 0 };
    fn add(&self, price_cents: i32) {
        self.count += 1;
        self.total_cents += price_cents;
    }
    fn total(self) -> i32 => self.total_cents;
}

var cart = Cart::empty();
cart.add(250);
cart.add(120);
println(cart.total());
```

Run it with `carven cart.cv` to print `370`. Generated C++ holds the fields in a struct and lowers each operation to an ordinary function. A class has no implicit equality, and `println(cart)` prints only its name, `Cart`, without exposing the fields. Classes cannot be used in required constant evaluation.

For logic involving several types and mutually calling functions, maintain their definitions in `.cv` source. The compiler generates interfaces and implementations from visibility and type dependencies, arranging forward declarations and definition order. Dependencies used only in function bodies do not merge interfaces.

**A useful starting point:** modules that benefit from less manual synchronization of declarations and implementations, with a generated public interface for C++ consumers.

## Validate fixed data and process byte blocks

Compile-time UTF helpers can encode Unicode scalars and check a fixed byte buffer before a program runs. For byte processing at runtime, SIMD Crafts provide bounded block traversal, comparisons, masks, and byte search. A tail block carries an active-lane mask so padding cannot become input.

The [compile-time tutorial](/learn/constants/) runs both tasks with complete examples. Static parameters let a function fix controls such as extraction offsets while retaining runtime data inputs. Native SIMD selects a portable, NEON, or consumer-enabled AVX2 backend during compilation, without runtime dispatch; all relevant translation units must agree on backend flags. Measure the target workload before assuming a speedup.

**A useful starting point:** validating embedded UTF-8 data or counting and finding bytes in a buffer with explicit bounds.

## Choose a scope you can verify

Carven currently fits learning, language exploration, and controlled integration experiments. For an evaluation, use the same revision of the compiler, support headers, documentation, and examples, and verify the capabilities your target project actually needs. `carven check` runs semantic analysis and compile-time tests without generating C++, which makes it a quick way to check the code before a full build.

Carven has no thread or synchronization operations, and its Read/Write/Take rules do not establish cross-thread safety. If C++ calls generated code from several threads, the C++ side owns synchronization and shared data.

The toolchain has separate host and target requirements: building the compiler requires an LLVM/Clang toolchain with C++26 support; generated programs and support libraries use C++20. The repository's validated host toolchain is LLVM 23.
