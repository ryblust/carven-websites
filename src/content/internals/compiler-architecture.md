---
title: "Compiler architecture"
description: "Follow source through parsing, checking, execution, and C++ generation."
section: internals
source: docs/compiler/README.md
---

## From source to a native program

Before generating a call, the compiler needs to know its argument types, possible failures, and the storage that must remain alive. Those facts determine which values to pass, where failure exits go, and what to clean up. Carven establishes them before it builds the C++ implementation.

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

The driver collects project files and standard-library sources into a source batch. Imports resolve within that batch. Parsing builds a `SyntaxProgram`; semantic analysis completes declarations and bodies in `ProgramDraft`, then publishes a checked `SemIRProgram`. The backend then uses the checked result to generate C++. The native toolchain checks delegated C++ operations, compiles, links, and optimizes the program.

## Shared analysis across compiler commands

`check`, `interpret`, `compile`, and direct execution share semantic analysis and required compile-time work. After analysis, they stop, enter the executor, or proceed to the C++ backend. See [compiler commands](/reference/cli/) for invocation and outputs.

## Analysis, execution, and C++ generation

<details class="architecture-detail">
<summary>Syntax → semantics: settle the source contracts</summary>

`ProgramDraft` is the mutable state used to complete declarations and function bodies. It reserves identities before completing bodies, allowing forward references and recursion. It then solves types and failure sets and checks complete bodies, async use, ownership, and local pointer nullability.

Successful analysis publishes a `SemIRProgram`: an immutable program of resolved types, structured operations, storage relationships, and source origins. Publishing means these facts have passed the required checks and are ready for other stages to consume. Errors prevent that handoff; warnings can accompany success.

After bodies are finalized, analysis also determines which calls and awaits may complete as cancelled. Templates and completed static tests can retain declarations and source origins without keeping runtime bodies. The backend reads the published program and no longer needs to query the source syntax tree.

</details>

<details class="architecture-detail">
<summary>Checked operations → execution: run them in the selected stage</summary>

Constant initializers, `const` blocks, static tests, and interpretation share an executor for typed values, control flow, and storage. The executor applies resource budgets and checks operations such as indexing against the values present during execution.

Each entry configures the executor's capabilities and execution host. The [constant reference](/reference/constants/) defines compile-time operations and retained results; the [command reference](/reference/cli/#interpretation) defines interpreter execution.

</details>

<details class="architecture-detail">
<summary>Semantics → C++: plan the implementation, then write its text</summary>

`PlannedCompilation` borrows the immutable semantic program and owns a `TargetPlan`. The plan selects names, interface groups, result representations, and artifact placement. The semantic program stays alive and unmoved while planning and lowering use it.

Each artifact has independent lowering state and target-type caches. `BodyPreparation` borrows published body facts to derive operation plans and operand storage demands. `BodyRealizer` and its fragments build target statements and expressions, arranging evaluation, temporaries, failure exits, and cleanup. Realization finishes before preparation is released. For example, if a later field initializer fails, an earlier completed field still needs the correct destruction path.

`TargetUnitBuilder::finish` collects header requirements and plans directives from artifact references and ordered native imports, producing the completed `TargetUnit`. Emission then serializes the structure and directives into C++ text. Writing files and invoking the native toolchain happen afterward.

</details>

## Preserve source behavior in generated C++

| Source behavior                                | What generation must preserve                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| A handler recovers one failure                 | Keep the other failure types and their payloads available to the caller |
| A value borrows an owner's storage             | Keep that storage alive through every required use and cleanup          |
| A static branch or loop specializes a function | Generate the selected work with distinct locals for expanded iterations |
| An expression has a known value and an effect  | Preserve the effect even when the value needs no runtime calculation    |
| An implicit operation fails a check            | Retain a source origin that makes the diagnostic understandable         |

Semantic analysis establishes what is valid. Backend preparation and realization choose an implementation that preserves it. Runtime support supplies native operations, and the C++ toolchain handles the remaining native checks and optimization.

## Standard definitions, artifacts, and workspace queries

Build systems need reusable analysis results; editors need current source information. Both use the same analysis pipeline.

Standard-library analysis can retain `CheckedDefinitions` for generic and staged functions alongside the executable program. A consumer uses those definitions to construct its own instances. `compiler.artifact` packages the program, optional definitions, module ownership, and whether the result can be cached. Multiple generation requests can reuse one checked program without repeating compile-time work.

The workspace layer manages document revisions, parsed snapshots, navigation indexes, and bounded analysis caches. Each uncached selection runs the complete semantic checks. Queries can retain known source information after an error, but that information does not establish that the program is valid. Reached input, clock reads, and waits produce workspace diagnostics so editor analysis does not perform those host effects.

## Implementation references

- [Built-in capabilities and runtime support](/internals/runtime-boundary/) explains what the generated program needs to run.
- [C++ generation and native integration](/features/cpp-generation/) follows a real module into generated interfaces and implementations.
- The repository's [semantic representation](https://github.com/ryblust/carven/blob/main/docs/compiler/analysis/semir.md) and [backend architecture](https://github.com/ryblust/carven/blob/main/docs/compiler/backend/README.md) describe the internal types and phase contracts.
