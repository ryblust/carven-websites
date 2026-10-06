---
title: A program’s journey through the Carven compiler
description: Follow a source batch through syntax, checked semantics, C++ target structures, and native compilation.
section: internals
source: docs/compiler/README.md
---

## From source to a native program

Carven establishes what a program means before arranging its C++ implementation. Each stage owns its input, output, and responsibilities. Later stages consume facts that have already been checked.

<figure class="architecture-map">
  <ol class="architecture-pipeline">
    <li><span>01</span><strong>Collect sources</strong><code>SourceBatch</code></li>
    <li><span>02</span><strong>Build syntax</strong><code>SyntaxProgram</code></li>
    <li><span>03</span><strong>Check & publish</strong><code>SemIRProgram</code></li>
    <li><span>04</span><strong>Construct C++</strong><code>TargetUnit</code></li>
    <li><span>05</span><strong>Emit & build</strong><code>C++ → program</code></li>
  </ol>
  <figcaption>Carven checks source contracts and generates C++; the C++ toolchain compiles, links, and optimizes the native program.</figcaption>
</figure>

The driver collects source files and Crafts into a closed source batch, within which imports resolve. The frontend builds syntax trees. Semantic analysis completes declarations and bodies, solves types and failure sets, and checks ownership and other contracts. On success, the backend receives an immutable semantic program and produces inspectable C++ files.

**C++ retains its native responsibilities:** overload resolution and template instantiation, object layout, optimization, and machine code. Source semantic checking and subsequent native compilation each have their own boundary.

## Explore three important handoffs

<details class="architecture-detail">
<summary>Syntax → semantics: complete the facts before handing them over</summary>

`ProgramDraft` is mutable construction state. It reserves declaration identities for forward references and recursion. After completing declarations and bodies, it solves types and failure sets, then finalizes signatures, declarations, and bodies.

Publication also checks body contracts, global semantic contracts, ownership, and local pointer nullability. Errors prevent delivery of a program; warnings may accompany a successful result.

`SemIRProgram` holds resolved types, structured operations, storage relationships, and provenance. The backend no longer queries an AST. Source templates and completed static tests may retain declarations and provenance without a runtime body. Later stages read these facts and derive their own implementation plans.

</details>

<details class="architecture-detail">
<summary>Semantic operations → static execution or interpretation: shared machinery, distinct admission</summary>

Constant roots, `const` blocks, static tests, and interpretation share a structured semantic executor. It handles typed values, control flow, and storage within resource budgets.

Required constant contexts call only explicit `const fn` functions and their admitted dependencies. Definitions receive executor-capability checks; published results also meet freezing and representation requirements. For example, a `String` built during constant initialization can freeze into a `str` with stable storage.

The interpreter checks support for operations on the paths it executes. Its supported subset does not replace native C++ calls or a complete native build. Sharing operations does not give these execution modes identical admission rules.

</details>

<details class="architecture-detail">
<summary>Semantics → C++: plan, prepare, realize, then render text</summary>

`PlannedCompilation` owns a semantic program and its matching immutable `TargetPlan`. Planning selects names, interfaces, failure representations, and artifact schedules.

`BodyPreparation` borrows published body facts to classify operand demands and select implementations. `BodyRealizer` composes these operations into target structures while preserving evaluation order, required storage, cleanup, and failure exits. A known result does not erase required effects or observable lifetimes.

A completed `TargetUnit` is verified and collects header requirements, native imports, and artifact dependencies. Only then does `emit` serialize it into C++ text. Filesystem output and native compilation are subsequent consumers.

</details>

## Designs worth noticing

| Problem                                                    | Compiler organization                                                                    | Consequence for a program                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Calls combine different failures                           | Preserve failure identities and payloads, solve sets, and check contracts after recovery | Recovering one failure leaves the remaining responsibilities explicit              |
| Reading, mutation, and transfer have distinct requirements | Retain access, storage, and lifetime relationships in semantic operations                | Parameter delivery and cleanup follow checked relationships                        |
| Static specialization changes control flow                 | Publish selected arms, expanded iterations, and distinct local identities                | The backend handles specialized results through ordinary storage and cleanup paths |
| A known value does not always permit removing evaluation   | Preserve effects, storage observations, and lifetimes while selecting implementations    | Static facts reduce work while retaining program behavior                          |
| Errors need a meaningful source location                   | Source operations carry origins; implicit operations retain expansion origins            | Language-rule diagnostics can point to the corresponding source                    |

These responsibilities belong to construction, publication, execution, or C++ generation. The backend derives implementation plans without modifying semantic stores. Runtime support implements native operations without solving source contracts.

## One analysis pipeline, several command exits

| Command            | Where its work finishes                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `carven check`     | After successful semantic analysis, including required constant execution and static tests |
| `carven interpret` | After analysis, execute semantic operations through the interpreter                        |
| `carven compile`   | After analysis, plan and emit C++ artifacts                                                |
| `carven main.cv`   | Generate C++, compile and link it with collected native sources, then execute the program  |

The driver owns source collection, options, file output, diagnostic presentation, and process launching. Semantic execution reports structured results; the driver transports them to the terminal. Lexical and syntax dumps consume the corresponding frontend results directly.

## Continue into the implementation

- [C++ runtime, Crafts, and native boundaries](/internals/runtime-boundary/): what generated code depends on and how existing libraries enter the program.
- [Let semantics shape the C++](/features/cpp-generation/): concrete examples of generated interfaces, storage, cleanup, and failures.
- The repository’s [semantic representation](https://github.com/ryblust/carven/blob/main/docs/compiler/analysis/semir.md) and [backend architecture](https://github.com/ryblust/carven/blob/main/docs/compiler/backend/README.md) documents describe internal representations and phase contracts.
