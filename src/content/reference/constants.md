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

Constant integer arithmetic checks overflow, division by zero, and shift ranges. Integer casts reduce modulo the destination width. Required constant execution supports f32/f64 negation, arithmetic, comparisons, and admitted numeric casts. `const x = 1.0 + 2.0;` evaluates to `3.0`. Ordinary runtime floating arithmetic and ordering retain native execution rather than acquiring optional facts through host computation.

## Constant blocks

`const { ... }` is a statement at module scope or inside statement blocks, without a trailing semicolon. Each block executes exactly once during semantic analysis, including blocks in uncalled functions, unselected runtime branches, and loops; it emits no runtime code. Blocks use constant-execution types and operations, including mutable locals, control flow, text, aggregates, const fn calls, and failure recovery.

Each block has independent lexical scope, storage, and budget. Visible constants are available; enclosing execution-frame parameters and runtime locals are unavailable. The result is void; `return;` or a void return operand ends the block, and loop transfers target only loops inside it. Nested constant blocks are independent evaluation roots.

Cross-block order is unspecified; operations requiring a sequence belong in one block. Declarations and lifetimes end inside the block. Output and diagnostics go to the compiler's caller and cannot be read back by another block.

`?` may propagate to the block boundary. Escaping failures, execution errors, and exhausted budgets fail compilation; completed output remains visible. Blocks create no test context: check/require/fail require an active const test. Blocks execute independently of test-artifact selection, including during `check`.

## const fn

A const fn is a named function eligible for required constant execution. Declaration alone does not execute it. Ordinary runtime calls remain runtime calls, even with literal arguments. Entries and import(cpp) cannot be const fn.

```carven
const fn label(count: i32) -> String {
    var result = String {};

    for index in 0..count {
        result.append_format(f"{index:02}");
    }

    return result;
}

const name = label(3); // str: 000102
```

Parameters use Read or Take and support integers, f32/f64, bool, char, str, String, integer ranges, and eligible fixed arrays/structs/enums. Results support those types or void; void cannot initialize a constant. Result inference follows ordinary function rules.

Supported operations include local initialization, assignment, Take, scalar operations, if/match/while, C-style for, integer and array ranges, return/break/continue, direct const fn calls, and recursion with resolvable dependencies. match supports builtin and enum subjects, literal/integer-range/enum-case/binding/wildcard/or patterns, and guards.

String supports construction, copying, as_str, len/is_empty, append/append_format, push/clear, interpolation, and printing. Interpolation supports defaults for integers, bool, char, and text, plus integer `b/B/o/d/x/X`, decimal width, and zero padding. f32/f64 support default formatting and `a/A/e/E/f/F/g/G`, with fill, alignment, sign, width, and precision following native standard-library rules. Dynamic width and precision evaluate first and accept nonnegative integers; compile-time formatting excludes locale-dependent `L`. Arrays support construction, indexing, element assignment, equality, copying, Read/Write iteration, whole-binding Take, parameters, and results. Structs support construction, field access/assignment, equality, copying, whole-binding Take, parameters, and results.

Enums support case construction, payload matching, equality, copying, Take, parameters, and results. Aggregate contents support numeric values, integer ranges, bool, char, str, String, and recursive arrays/structs/enums. String fields or elements are not frozen into str. Empty arrays require element context. Nominal identity, lengths, and every member type are preserved.

Read arrays and structs containing arrays observe contents after all arguments have evaluated. Scalars and eligible structs without arrays save values at their argument positions. Read String also reads contents after all arguments or holes complete. Field and index projections follow the selected value's type rules.

## Compile-time failure contracts

const fn uses ordinary failure rules: throw creates a typed payload, `?` propagates it, and try/catch matches its type and payload. Guards, alternatives, nested recovery, and rethrow share the same execution flow. Payloads support owning text and executable aggregates. Taking a catch binding does not consume the original failure retained for rethrow.

In a constant initializer or array extent, `fallible()?` propagates to the evaluation entry: actual success can form a constant; an escaping failure is diagnosed at the throw with call context. Success does not permit omitting a required `?`, and a redundant `?` on a failure-free expression is still rejected. Inferred contracts remain subject to the ordinary failure solver. const test retains its static rule against unhandled failures. Evaluator errors, exhausted budgets, and failed assertions cannot be recovered with catch.

## Admission and freezing

All definitions are checked, including uncalled functions and inactive branches. const fn does not support native operations, Write parameters/arguments, pointers, slices, callables, indirect calls, text bytes/chars iteration, or unchecked text construction. Mutable locals and array Write iteration remain available. Executing a value and retaining it in a generated constant are separate requirements.

String retains owning and Take semantics during computation. Only when the entire constant initializer completes does an owning text result freeze to str. `const name: String = label(3);` is invalid. Array results may become frozen slices at this boundary; const fn cannot manipulate slices internally.

## Compile-time and runtime arithmetic

Required constant execution checks integer overflow, division by zero, and invalid shifts. An ordinary runtime call to the same const fn follows runtime integer rules, including modulo wrapping for addition, subtraction, and multiplication. The const modifier does not make every call use checked arithmetic.

Short-circuiting and control flow determine which operations actually execute; definition admission still checks every branch. An unexecuted division by zero does not trigger an evaluation error, but an inactive branch cannot hide an unsupported native call.

Floating execution uses the compiler host's native float/double environment. Signed zero, infinities, and NaNs are retained values; floating division by zero follows native floating rules, not integer diagnostics. Frozen results are reconstructed in generated C++. Results need not match runtime expressions evaluated under different target settings, rounding environments, or optimization choices.

## Relationship to C++ constant facilities

These forms are not keyword substitutions:

| Carven rule                                                                       | C++20 comparison                                                                                                                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| const fn permits required constant execution; ordinary calls retain runtime rules | constexpr functions can also run during compilation or at runtime, with different admission rules                                                      |
| A completed constant initializer freezes a String result into str                 | constexpr string can construct text; retaining the result must meet constant-expression and storage rules, with no automatic conversion to string_view |
| const test executes a supported test body during semantic analysis                | static_assert checks a constant condition, rather than replacing an entire test body                                                                   |
| Native C++ calls cannot enter Carven's required constant execution                | Declaring the C++ function constexpr does not change this boundary                                                                                     |

The [compile-time tutorial](/learn/constants/) includes a complete C++20 comparison for the same text construction. Freezing is a result-representation rule, not a promise to remove allocation from every runtime const fn call.

## Execution budgets

| Limit                                             | Value   |
| ------------------------------------------------- | ------- |
| Execution steps per call tree                     | 100,000 |
| Nested call depth                                 | 128     |
| Single text value                                 | 1 MiB   |
| Cumulative text construction, copying, and output | 8 MiB   |
| All nested field/element slots in one aggregate   | 65,536  |
| Aggregate nesting depth                           | 64      |
| Cumulative slot construction and copying          | 524,288 |

Append counts added bytes. Queries do not copy their receiver. Budgets measure work, not live memory. Direct aggregate initialization is also subject to size, depth, and work limits. Format specifications have an additional nesting limit.

Definition admission errors use `CV-CONST-ADMISSION`, execution errors `CV-CONST-EVALUATION`, and budget failures `CV-CONST-LIMIT`. Type, arithmetic, and dependency diagnostics still apply. Failure never falls back to runtime.
