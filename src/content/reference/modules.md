---
title: "Modules, declarations, and visibility"
description: "Explicit input batches, craft domains, import resolution, name lookup, and interface visibility."
section: reference
lesson: 2
source: docs/semantics.md
---

## Batches and canonical module names

A compilation includes only source files explicitly supplied by the caller. Import does not search the filesystem or download dependencies. Each input maps to a unique canonical module name. Path components follow `[A-Za-z_][A-Za-z0-9_]*`; module components may be language keywords.

```text
src/main.cv                  → src.main
crafts/json/parser.cv        → crafts.json.parser
crafts/carven/std/utf/text.cv → crafts.carven.std.utf.text
```

A leading `crafts.<name>.<path>` defines a craft domain. Neither `crafts` nor `crafts.<name>` alone is a complete module. Ordinary application modules belong to the unprefixed domain. A nonleading crafts is an ordinary component. The official craft is carven; `std::` specifically selects its std subtree.

## Three import path forms

```carven
import model.user using User;
import .value using Value;
import json::parser using parse;
import std::utf.text using *;
```

| Reference       | Starting point                                                  |
| --------------- | --------------------------------------------------------------- |
| `model.user`    | Current craft domain root                                       |
| `.value`        | Current module's logical directory, dropping its last component |
| `json::parser`  | `crafts.json`                                                   |
| `std::utf.text` | `crafts.carven.std`                                             |

In `crafts.foo.models.user`, `.value` selects `crafts.foo.models.value`. Unprefixed and relative imports stay within the current domain. The target must be another module in the batch. Self-imports, missing modules, and duplicate canonical input names are errors.

The import path selects a module; using selects names or introduces a name environment. Cross-module use requires an explicit import. Wildcards supplying the same name become ambiguous only when that name is actually needed. Explicit selections take precedence over same-named wildcard entries; they cannot conflict with a local declaration or map one binding name to different symbols.

Imports have no runtime side effects. An import counts as used through an actual uniquely resolved reference. Unused imports produce `CV-LINT-UNUSED-IMPORT`. C++ header imports may share the import prefix but do not resolve Carven modules.

## Declarations and lookup

Functions, structs, enums, and module constants share one module namespace. Duplicate module declaration names are invalid; functions do not overload. Modules may also contain tests, C++ fragments, and entry statements.

Declaration identities are collected across the batch. Valid forward calls, mutual recursion, and constant dependencies are independent of source order. Cycles in required constant facts are errors.

Unprefixed lookup starts in the innermost lexical scope, then proceeds through outer scopes, module declarations, and imports. Names cannot repeat within one lexical scope; inner scopes may shadow outer ones. A local name becomes visible after its type, initializer, and constant proof are complete, so an initializer may refer to an outer binding of the same name.

A lambda is a capture boundary. Outer runtime bindings need explicit capture; module declarations and compile-time constants remain directly accessible.

## Visibility

| Form        | Audience                                                 |
| ----------- | -------------------------------------------------------- |
| `private`   | Defining module                                          |
| No modifier | All modules in the same craft domain                     |
| `export`    | All modules in the current batch, including other crafts |

Every declaration is visible in its own module. Its defining domain determines visibility, regardless of import spelling. Modules selected through `std::` still belong to the carven craft. Ordinary application modules can select each other's bare declarations.

A declaration's published surface may use only nominal types visible to all its readers. Recursive checks cover parameters, results, failure sets, nested callables, fields, enum payloads and backing types, arrays, and constants' types and normalized values. Identities eliminated within bodies or constant computation are not part of that surface. Leaking an invisible type produces `CV-TYPE-VISIBILITY-LEAK`.

```carven
private struct Hidden {}

// Compile error: export readers cannot see Hidden.
export fn expose() -> Hidden {
    return Hidden {};
}
```

Direct execution assembles its batch from explicit application files plus the fixed toolchain and project Crafts roots. `compile` and `interpret` do not collect those roots automatically. This happens before import resolution and does not make imports search the filesystem.
