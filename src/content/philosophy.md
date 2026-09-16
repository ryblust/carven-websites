---
title: "Let the compiler carry intent into implementation"
description: "Higher-level expression, checkable semantics, and native execution through the C++ toolchain."
section: philosophy
source: docs/principles.md
---

## Consistent semantics on a native foundation

C++ provides objects, templates, containers, algorithms, and a mature toolchain. Carven builds on those capabilities with a common set of source rules for access, ownership, evaluation, and failure. The compiler then arranges the corresponding native implementation.

**Higher-level expression still has concrete runtime behavior.** A language construct needs to define which programs it permits, which guarantees it provides, and which storage, calls, and cleanup it requires.

## Describe the computation. Let the compiler arrange storage.

Joining text at compile time needs inputs, a separator, an order, and a choice of when to compute it. Those decisions belong in source. The resulting byte count and its static storage can be determined from the result.

The [compile-time tutorial](/learn/constants/) puts two complete implementations together. C++20 join builds a string with an ordinary loop; a freeze template then computes its length, creates an array, and supplies a string_view. Carven uses the same loop and freezes String into str when const initialization completes.

Changing the input text can change the result length without changing the algorithm. Carven includes the storage step in its language rules, so each result needs no separately arranged storage code. A C++ library can encapsulate this work too; Carven makes it available directly for supported constant construction.

## Keep meaningful decisions in the source

Reading, modifying, and transferring ownership express different intentions. Carven names them Read, Write, and Take, checking the corresponding permissions at declarations and uses. Inference supplies information the compiler can determine; explicit operations express choices about access, captures, and propagation.

In C++, the permitted uses of an object after a move depend on the type and operation contracts. Carven's Take also changes the source owner's static availability: the compiler checks subsequent uses and restoration. The same rule participates in calls, closures, and control-flow joins.

Known borrowing relationships constrain the lifetime of backing storage. Providers and callers remain responsible for the validity of objects reached through external C++ pointers. The scope of checking follows the information the compiler actually has.

## Preserve detail through composition

As functions and callbacks form a business workflow, failures retain their types and payloads. Private implementations infer the combined set, shared interfaces declare its upper bound, and recovery removes failures it handles completely.

Modules can retain their own failure types while callers handle the remaining failures declared by the interface. Evaluation order, local cleanup, and the original failure identity are preserved together. The application defines its recovery policy.

The [failure-contract tutorial](/learn/failures/) shows the same division of responsibility. Choosing a default for a missing price is a programmer's decision; determining which failures remain is something the compiler can derive and check. C++23 expected and variant can express the same results, with code or libraries arranging error-set composition, conversions, and branches.

The rules also apply after edits. Removing a recovery branch may invalidate the existing public contract; Carven rejects that implementation. The example demonstrates checks that continue to apply as the program changes, beyond its initial output.

## Use known facts to reduce work

Constant functions can construct data using loops and mutable locals. Required constant contexts determine when they execute and which results can be frozen. Compile-time tests check those results before the target program is generated.

Dynamic operations can still have known structure. Fixed text, integer formats, and capacity bounds can be prepared ahead of time and consumed by specialized runtime operations. A known result and permission to omit execution are separate decisions: side effects and object lifetimes remain part of the program.

Static checking and native optimization have distinct jobs. Carven establishes types, pattern coverage, evaluation order, ownership, and failure contracts. Simplification must preserve required execution and storage observations; the C++ compiler handles native optimization, including eliminating storage when it can prove that safe.

## Bring existing libraries with you

These language rules sit on a native ecosystem you can keep using. The [third-party library example](/learn/interop/) calls nlohmann/json, retains its native object, and invokes its methods. Those calls need no dedicated binding layer; the native project still manages dependencies and include paths.

The boundary stays explicit. Carven does not automatically turn native exceptions into typed failures or prove arbitrary external pointer lifetimes. An adapter can establish the contract the application needs; Carven then checks and composes the facts available to it.

## Measure cost against equivalent handwritten C++

Carven's cost baseline is skilled handwritten C++ providing the same evaluation, ownership, lifetime, and checking guarantees. Facts useful only during compilation need not become runtime state. Retained state and operations serve the behavior the program requires.

Generated C++ is directly inspectable, and native tools can measure its performance. Compilation time, artifact size, allocations, and execution time are evaluated separately. Concrete benefits depend on the operation and workload.

## Carry the same facts through implementation

Source modules and visibility determine interface organization. Semantic access and failure contracts determine calls and storage. Known values and structure determine which work can be prepared. Later compilation stages reuse these checks, reducing the information programmers must declare again.

**Carven aims to turn higher-level expression into native programs whose implementation can be examined.** C++ libraries and tools provide the foundation; the language and compiler organize it into a consistent, checkable programming experience.
