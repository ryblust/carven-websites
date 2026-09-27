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

Supported forms include literals, numeric enum cases, completed constants, parentheses, allowed casts, pure unary/binary operations, constant text queries, all-constant payload construction, supported interpolation and String operations, and direct calls to explicitly declared `const fn` functions with constant arguments when the executed operations are supported. Fixed arrays, structs, indexing, fields, and memberwise equality can produce constants in the supported aggregate subset. Constant initializers can also create and query frozen slices.

Calls to ordinary `fn` and direct control-flow expressions are not constant expressions; a required constant calling an ordinary function reports `CV-CONST-ADMISSION`. Put branching or loops in a const fn or a constant block. A known runtime result does not make an expression constant: `(source() == 1) && false` with an ordinary call still fails constant-expression requirements.

Integer literals are range checked for their selected type. Integer negation, addition, subtraction, multiplication, and left shift wrap to the type width, exactly as at runtime; `const wrapped = max + 1;` with `max: i32 = 2147483647` is `-2147483648`. Division by zero and invalid shift counts are diagnosed when they execute during compilation. Integer casts reduce modulo the destination width. Required constant execution supports f32/f64 negation, arithmetic, comparisons, and admitted numeric casts. `const x = 1.0 + 2.0;` evaluates to `3.0`. Ordinary runtime floating arithmetic and ordering retain native execution rather than acquiring optional facts through host computation.

## Constant blocks

`const { ... }` is a statement at module scope or inside statement blocks, without a trailing semicolon. An optional string labels the block in diagnostics, as in `const "prepare table" { ... }`; the label is not a declared symbol and need not be unique. Each block executes exactly once during semantic analysis, including blocks in uncalled functions, unselected runtime branches, and loops; it emits no runtime code. Blocks use constant-execution types and operations, including mutable locals, control flow, text, aggregates, const fn calls, and failure recovery. External C++ construction and calls are outside this subset; required evaluation runs in the Carven executor and does not compile or run C++ providers.

Each block has independent lexical scope, storage, and budget. Visible constants are available; enclosing execution-frame parameters and runtime locals are unavailable. The result is void; `return;` or a void return operand ends the block, and loop transfers target only loops inside it. Nested constant blocks are independent evaluation roots.

Cross-block order is unspecified; operations requiring a sequence belong in one block. Declarations and lifetimes end inside the block. Output and diagnostics go to the compiler's caller and cannot be read back by another block.

`?` may propagate to the block boundary. Escaping failures, execution errors, and exhausted budgets fail compilation; completed output remains visible. Blocks create no test context: check/require/fail require an active const test. Blocks execute independently of test-artifact selection, including during `check`.

## const fn

`const fn` declares that a named Carven function can be called from required constant contexts: local and module constant initializers, array extents, constant blocks, and `const test`. Required contexts call only such functions. Declaration alone does not execute it, and a runtime call remains an ordinary call even when every argument is known. Entries and import(cpp) declarations cannot be const fn.

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

Each `const fn` definition is checked for executor capability when it is defined, not when it is first called. Its signature and semantically reachable operations must be supported, and every reachable call, including a call through a local callable binding, must select a known `const fn`. Otherwise the definition reports `CV-CONST-ADMISSION`, even if nothing calls it:

```carven
fn double(value: i32) -> i32 => value * 2;

// Compile error: CV-CONST-ADMISSION, double is not a const fn.
const fn quadruple(value: i32) -> i32 => double(double(value));
```

Operations after an unconditional return, or excluded by language constant facts, still receive ordinary semantic checks but need no executor capability. Paths selected only by call arguments remain part of the capability check. Recursion is allowed when signatures and bodies can be completed without a construction dependency cycle; the capability check does not prove termination.

Signatures follow ordinary rules, including Read, Write, and Take parameters. A void result cannot initialize a constant; other results must be eligible for the consuming constant boundary. Result inference follows ordinary function rules.

Supported operations include scalar arithmetic, comparisons, logical operations and casts; local initialization, assignment, and Take; if/match/while, C-style for, integer ranges, array and slice loops; return/break/continue; direct const fn calls, and indirect calls through local bindings of named const fn. match supports builtin and enum subjects, literal/integer-range/enum-case/binding/wildcard/or patterns, and guards. Local pointers can be created and dereferenced while their target is alive, and Write parameters update the caller's storage.

```carven
const fn total(values: [i32]) -> i32 {
    var sum = 0;
    for value in values {
        sum += value;
    }
    return sum;
}

const fn bump(&value: i32) {
    value += 1;
}

const fn run() -> i32 {
    let values = [1, 2, 3, 4];
    var result = total(values.as_slice().slice(1, 3));
    bump(&result);
    let sum = total;
    return sum(values.as_slice()) + result;
}

const answer = run(); // 16
```

String supports construction, copying, as_str, len/is_empty, append/append_format, push/clear, byte views and byte iteration, interpolation, and printing. Interpolation supports defaults for integers, bool, char, and text, including known C string contents, plus integer `b/B/o/d/x/X`, decimal width, and zero padding. f32/f64 support default formatting and `a/A/e/E/f/F/g/G`, with fill, alignment, sign, width, and precision following native standard-library rules. Dynamic width and precision evaluate first and accept nonnegative integers; compile-time formatting excludes locale-dependent `L`. Arrays support construction, indexing, element assignment, equality, copying, Read/Write iteration, whole-binding Take, parameters, and results. Slices support indexing, subslicing, and loops against live backing storage. Structs support construction, field access/assignment, equality, copying, whole-binding Take, parameters, and results.

Enums support case construction, payload matching, equality, copying, Take, parameters, and results. Fields, elements, and payloads follow the same execution type rules recursively; publishing a completed constant also requires each component to support freezing. String fields or elements are not frozen into str. Empty arrays require element context. Nominal identity, lengths, and every member type are preserved. C strings support constant initialization, calls, local copies, assignment, and Take; freezing preserves their bytes and pointer type.

Read arguments containing array or String storage observe their contents after all arguments have evaluated. Other supported values are saved at their argument positions. Field and index projections follow the selected value's type rules.

## Compile-time failure contracts

const fn uses ordinary failure rules: throw creates a typed payload, `?` propagates it, and try/catch matches its type and payload. Guards, alternatives, nested recovery, and rethrow share the same execution flow. Payloads support owning text and executable aggregates. Taking a catch binding does not consume the original failure retained for rethrow.

In a constant initializer or array extent, `fallible()?` propagates to the evaluation entry: actual success can form a constant; an escaping failure is diagnosed at the throw with call context. Success does not permit omitting a required `?`, and a redundant `?` on a failure-free expression is still rejected. Inferred contracts remain subject to the ordinary failure solver. const test retains its static rule against unhandled failures. Evaluator errors, exhausted budgets, and failed assertions cannot be recovered with catch.

## Admission and freezing

Native operations, calls through callable values without an executable Carven body, text character iteration, unchecked text construction, and class values and operations are outside the constant execution subset. Ordinary type, access, ownership, and lifetime validation applies throughout. The executor tracks local object lifetimes: dereferencing a pointer after its target's scope exits or after Take reports `CV-CONST-EVALUATION`. Non-null local pointers cannot become published constant values. Executing a value and retaining it in a generated constant are separate requirements.

String retains owning and Take semantics during computation. Only when the entire constant initializer completes does an owning text result freeze to str. `const name: String = label(3);` is invalid. Slices borrow live backing during execution; a completed constant root freezes the selected elements before releasing that backing.

## Compile-time and runtime arithmetic

Integer arithmetic is the same at compile time and runtime. Negation, addition, subtraction, multiplication, and left shift wrap at the type width; signed `MIN / -1` yields `MIN`. Division or remainder by zero and a negative or out-of-width shift count are diagnosed when required execution reaches them (`CV-CONST-DIVIDE-BY-ZERO`, `CV-CONST-SHIFT-RANGE`) and terminate at runtime.

```carven
const fn next(value: u8) -> u8 => value + 1;

const wrapped = next(255);

const test "wrapping matches runtime" {
    check(wrapped == 0);
}

println(next(255)); // 0
```

Short-circuiting and control flow determine which operations actually execute. An unexecuted division by zero does not trigger an evaluation error, but a reachable unsupported native call in a `const fn` is still rejected at its definition.

Floating execution uses the compiler host's native float/double environment. Signed zero, infinities, and NaNs are retained values; floating division by zero follows native floating rules, not integer diagnostics. Frozen results are reconstructed in generated C++. Results need not match runtime expressions evaluated under different target settings, rounding environments, or optimization choices.

## Relationship to C++ constant facilities

These forms are not keyword substitutions:

| Carven rule                                                                                   | C++20 comparison                                                                                                                                       |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| const fn declares a capability checked at its definition; runtime calls remain ordinary calls | constexpr functions can also run during compilation or at runtime, with different admission rules                                                      |
| A completed constant initializer freezes a String result into str                             | constexpr string can construct text; retaining the result must meet constant-expression and storage rules, with no automatic conversion to string_view |
| const test executes a supported test body during semantic analysis                            | static_assert checks a constant condition, rather than replacing an entire test body                                                                   |
| Native C++ calls cannot enter Carven's required constant execution                            | Declaring the C++ function constexpr does not change this boundary                                                                                     |

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

Unsupported operations in a required expression or a `const fn` capability check use `CV-CONST-ADMISSION`, execution errors `CV-CONST-EVALUATION`, failed assertions `CV-ASSERT`, and budget failures `CV-CONST-LIMIT`. Type, arithmetic, and dependency diagnostics still apply. Failure never falls back to runtime.
