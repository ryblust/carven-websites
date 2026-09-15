---
title: "Constants, const fn, and execution budgets"
description: "Constant facts, module constants, compile-time functions, text freezing, and resource limits."
section: reference
lesson: 13
source: docs/semantics.md
---

## Constant declarations

Module const defines a named, typed compile-time value. Private and bare declarations may infer their types. export const requires an explicit annotation; a literal suffix is not a substitute. Module `const _` is invalid.

```carven
private const radix = 10;
const retries: i32 = 3;
export const protocol: u32 = 1;
```

Initialization completes in dependency order, permitting forward references. A cycle of required facts produces `CV-CONST-CYCLE`. Every use denotes the same normalized value. Constants provide Read only, with no runtime binding, source address, or linkage identity. Frozen slices may have static backing, while the declaration itself still has no address identity.

A local const is a compile-time lexical name. Lambdas may use it directly without capture.

## Constant expression scope

Supported forms include literals, numeric enum cases, completed constants, parentheses, allowed casts, pure unary/binary operations, constant text queries, all-constant payload construction, supported interpolation and String operations, and direct const fn calls with constant arguments. Fixed arrays, structs, indexing, fields, and memberwise equality can produce constants in the supported aggregate subset. Constant initializers can also create and query frozen slices.

Ordinary function calls and direct control-flow expressions are not constant expressions. Put branching or loops in a const fn. A known runtime result does not make an expression constant: `(source() == 1) && false` with an ordinary call still fails constant-expression requirements.

Constant integer arithmetic checks overflow, division by zero, and shift ranges. Integer casts reduce modulo the destination width. Floating literals, supported casts, and equality can form constant facts; ordinary floating arithmetic and ordering cannot. `const x = 1.0 + 2.0;` is invalid.

## const fn

A const fn is a named function eligible for required constant execution. Declaration alone does not execute it. Ordinary runtime calls remain runtime calls, even with literal arguments. Entries and import(cpp) cannot be const fn.

```carven
const fn label(count: i32) -> String {
    var result = String::new();

    for index in 0..count {
        result.append_format(f"{index:02}");
    }

    return result;
}

const name = label(3); // str: 000102
```

Parameters use Read or Take and support integers, bool, char, str, String, and eligible fixed arrays/structs. Results support those types or void; void cannot initialize a constant. Result inference follows ordinary function rules.

Supported operations include local initialization, assignment, Take, scalar operations, if/match/while, C-style for, integer and array ranges, return/break/continue, direct const fn calls, and recursion with resolvable dependencies. match supports builtin subjects, literal/binding/wildcard/or patterns, and guards.

String supports construction, copying, as_str, len/is_empty, append/append_format, push/clear, supported interpolation, and printing. Interpolation supports defaults for integers, bool, char, and text; integer `b/B/o/d/x/X`; decimal width; and optional zero padding. Supported dynamic-width expressions evaluate first. Other formats cannot be used in required constant execution even when valid at runtime. Arrays support construction, indexing, element assignment, equality, copying, Read/Write iteration, whole-binding Take, parameters, and results. Structs support construction, field access/assignment, equality, copying, whole-binding Take, parameters, and results.

Aggregate contents support only integers, bool, char, str, and recursive arrays/structs. String fields or elements are not frozen into str. Empty arrays require element context. Nominal identity, lengths, and every member type are preserved.

Read arrays and structs containing arrays observe contents after all arguments have evaluated. Scalars and eligible structs without arrays save values at their argument positions. Read String also reads contents after all arguments or holes complete. Field and index projections follow the selected value's type rules.

## Admission and freezing

All definitions are checked, including uncalled functions and inactive branches. const fn does not support native operations, Write parameters/arguments, typed failures, throw/try/?, floating point, enums, pointers, slices, callables, indirect calls, text bytes/chars iteration, or unchecked text construction. Mutable locals and array Write iteration remain available.

String retains owning and Take semantics during computation. Only when the entire constant initializer completes does an owning text result freeze to str. `const name: String = label(3);` is invalid. Array results may become frozen slices at this boundary; const fn cannot manipulate slices internally.

## Compile-time and runtime arithmetic

Required constant execution checks integer overflow, division by zero, and invalid shifts. An ordinary runtime call to the same const fn follows runtime integer rules, including modulo wrapping for addition, subtraction, and multiplication. The const modifier does not make every call use checked arithmetic.

Short-circuiting and control flow determine which operations actually execute; definition admission still checks every branch. An unexecuted division by zero does not trigger an evaluation error, but an inactive branch cannot hide an unsupported native call.

## Execution budgets

| Limit                                             | Current value |
| ------------------------------------------------- | ------------- |
| Execution steps per call tree                     | 100,000       |
| Nested call depth                                 | 128           |
| Single text value                                 | 1 MiB         |
| Cumulative text construction, copying, and output | 8 MiB         |
| All nested field/element slots in one aggregate   | 65,536        |
| Aggregate nesting depth                           | 64            |
| Cumulative slot construction and copying          | 524,288       |

Append counts added bytes. Queries do not copy their receiver. Budgets measure work, not live memory. Direct aggregate initialization is also subject to size, depth, and work limits. Format specifications have an additional nesting limit.

Definition admission errors use `CV-CONST-ADMISSION`, execution errors `CV-CONST-EVALUATION`, and budget failures `CV-CONST-LIMIT`. Type, arithmetic, and dependency diagnostics still apply. Failure never falls back to runtime.
