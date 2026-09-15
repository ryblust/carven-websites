---
title: "Let the compiler carry intent into implementation"
description: "Higher-level expression, checkable semantics, and native execution through the C++ toolchain."
section: philosophy
source: docs/principles.md
---

## Consistent semantics on a native foundation

C++ provides objects, templates, containers, algorithms, and a mature toolchain. Carven builds on those capabilities with a common set of source rules for access, ownership, evaluation, and failure. The compiler then arranges the corresponding native implementation.

**Higher-level expression still has concrete runtime behavior.** A language construct needs to define which programs it permits, which guarantees it provides, and which storage, calls, and cleanup it requires.

## Keep meaningful decisions in the source

Reading, modifying, and transferring ownership express different intentions. Carven names them Read, Write, and Take, checking the corresponding permissions at declarations and uses. Inference supplies information the compiler can determine; explicit operations express choices about access, captures, and propagation.

In C++, the permitted uses of an object after a move depend on the type and operation contracts. Carven's Take also changes the source owner's static availability: the compiler checks subsequent uses and restoration. The same rule participates in calls, closures, and control-flow joins.

Known borrowing relationships constrain the lifetime of backing storage. Providers and callers remain responsible for the validity of objects reached through external C++ pointers. The scope of checking follows the information the compiler actually has.

## Preserve detail through composition

As functions and callbacks form a business workflow, failures retain their types and payloads. Private implementations infer the combined set, shared interfaces declare its upper bound, and recovery removes failures it handles completely.

Modules can keep their own failure vocabulary while callers see the responsibility that remains. Evaluation order, local cleanup, and the original failure identity are preserved together. The application defines its recovery policy.

## Use known facts to reduce work

Constant functions can construct data using loops and mutable locals. Required constant contexts determine when they execute and which results can be frozen. Compile-time tests check those results before the target program is generated.

Dynamic operations can still have known structure. Fixed text, integer formats, and capacity bounds can be prepared ahead of time and consumed by specialized runtime operations. A known result and permission to omit execution are separate decisions: side effects and object lifetimes remain part of the program.

## Measure cost against equivalent handwritten C++

Carven's cost baseline is skilled handwritten C++ providing the same evaluation, ownership, lifetime, and checking guarantees. Facts useful only during compilation need not become runtime state. Retained state and operations serve the behavior the program requires.

Generated C++ is directly inspectable, and native tools can measure its performance. Compilation time, artifact size, allocations, and execution time are evaluated separately. Concrete benefits depend on the operation and workload.

## Carry the same facts through implementation

Source modules and visibility determine interface organization. Semantic access and failure contracts determine calls and storage. Known values and structure determine which work can be prepared. Later stages use facts already checked, reducing the need for programmers to restate the same intent.

**Carven aims to turn higher-level expression into native programs whose implementation can be examined.** C++ libraries and tools provide the foundation; the language and compiler organize it into a consistent, checkable programming experience.
