---
title: "Do known work ahead of time"
description: "Build constants with ordinary control flow, verify them during compilation, and carry known structure into native code."
section: compile-time
source: docs/semantics.md
---

## Build incrementally during compilation

Lookup tables, fixed records, and text often need loops, local mutation, and helper functions. Within its supported execution subset, Carven's const fn lets you prepare data in these familiar ways.

```carven
const fn make_catalog(count: i32) -> String {
    var result = String::new();

    for index in 0..count {
        if index != 0 {
            result.push(',');
        }
        result.append_format(f"{index:02}");
    }

    return result;
}

const catalog = make_catalog(4);
```

catalog becomes `00,01,02,03` during compilation. While the function executes, String can grow, be copied, and be transferred. At the end of constant initialization, the result freezes into str backed by static storage. The running program does not need to repeat this construction loop.

**Construction can be mutable while the delivered data is static.** Fixed arrays and supported structures can also be built incrementally. Array results can become read-only slices with static backing at the constant-initialization boundary.

## Connect the construction process to a static result

C++ constexpr, consteval, and templates also express compile-time work. In handwritten native code, constant-evaluation and object-storage rules guide how to construct data and which result representations can be retained.

Carven evaluates supported source operations itself and freezes results when initialization completes. Here, temporary String construction delivers a static str. This happens before C++ generation, without requiring the corresponding runtime text functions to perform the same computation in C++ constant evaluation.

## One algorithm, an explicit execution stage

A const fn call in a required constant context is evaluated by Carven. An ordinary runtime call remains a runtime function call, even when its arguments happen to be literals.

make_catalog can therefore prepare a fixed catalog or construct text from runtime input. The source contract determines the stage. A required constant computation that cannot complete produces a diagnostic rather than falling back to runtime.

## Verify before the program runs

Compile-time data can immediately be checked by a compile-time test. Place this test in the same file as catalog above:

```carven
const test "catalog contents" {
    check(catalog == "00,01,02,03");
    check(catalog.len() == 11);
}
```

const test executes during semantic analysis, independently of runtime test-artifact options. A passing test need not remain in the target program. It can check constant algorithms, generated tables, and constraints on fixed data.

Compile-time execution also supports explicit printing to observe construction and verification. That output belongs to the compilation stage; a later compilation failure does not undo it.

## Dynamic values can still have known structure

Preparing work does not require the whole result to be constant. A runtime order number may be unknown while the fixed text, integer base, and padding width are known:

```carven
fn print_order(id: i32) {
    println(f"Order {id:08x}");
}
```

For the currently supported integer formatting path, Carven analyzes fixed segments and conversion requirements ahead of time, then generates writes that use that information directly. Runtime code converts the number and manages destination storage without parsing this format again. Known size bounds also help prepare capacity.

**Compute known results early; prepare known structure early.** Forms requiring general native formatting keep that path. Argument evaluation, side effects, borrowing observations, and failure behavior retain their source semantics.

## Current capabilities have a defined scope

Required constant execution supports integers, booleans, characters, text, supported fixed arrays and structures, and the corresponding control flow and direct const fn calls. Execution steps, recursion depth, text work, and aggregate work are bounded.

const fn currently does not execute typed failures, floating-point operations, native C++ operations, or indirect callable calls. Compile-time tests verify supported compile-time behavior; runtime tests verify the generated program's native behavior.
