---
title: "Entries, runtime tests, and compile-time tests"
description: "Entry selection, process status, check/require/fail, and test-stop propagation."
section: reference
lesson: 14
source: docs/semantics.md
---

## Entries

A compilation batch has at most one program entry: either a function named main or a file containing top-level executable statements. Multiple entries are diagnosed at their source locations. C++ generation may have no entry, but program execution requires one.

Top-level statements form an implicit entry in order, with declarations allowed among them. Top-level const remains a module constant; let/var are entry locals that module functions cannot capture. An implicit entry has no source callable name, parameters, or declared failure set. It follows ordinary function-body inference, access, cleanup, and failure-handling rules. Consequently, top-level statements must handle every failure. Use an explicit main to declare escaping failures.

```carven
const heading = "Carven";
println(heading);
```

An explicit main is selected regardless of module path, craft, or visibility. It may have no parameters or one unannotated Read command-line parameter. That parameter is an entry-specific opaque value, not an indexable or iterable sequence. Ordinary function parameters still require types.

Outward entry failures require explicit throw, including private main. Normal completion produces process status zero; a Carven return value, even an integer, is not the status. A typed failure escaping the entry produces C++ EXIT_FAILURE without automatically printing its payload or becoming a C++ exception. Ordinary local, result, and payload cleanup still occurs. Catching the failure and completing normally gives zero.

## Test declarations

`test "name" { ... }` is a module-local body without parameters or a result. Its name is unique within the module and cannot be main. Tests are parsed and semantically checked regardless of requested test artifacts and must not expose escaping failures.

```carven
fn add(a: i32, b: i32) -> i32 => a + b;

test "addition" {
    check(add(20, 22) == 42);
}
```

By default, ordinary tests are only analyzed. `compile --tests=default` emits module test functions, a runner, and a default entry. `--tests=external` emits test functions and a runner, with the C++ consumer supplying the entry.

## Test operations

```text
check(condition);
check(condition, message);
require(condition);
require(condition, message);
fail();
fail(message);
```

A condition must be bool; an optional message is str or String. Argument count, condition type, and message type errors use `CV-TEST-ARGUMENT-COUNT`, `CV-TEST-CONDITION-TYPE`, and `CV-TEST-MESSAGE-TYPE` respectively.

Conditions evaluate before messages, once each, even when the condition succeeds. A failed check reports and continues. A failed require or fail reports and stops the entire current test, including nested Carven helpers and views. Test stopping differs from return, break, and typed failure; try cannot catch it. After ordinary cleanup, the runner proceeds to the next test. This propagation cannot cross arbitrary native C++ callbacks.

The runner supplies test context to the synchronous Carven call chain without a source context argument. Calling test operations at runtime without an active test violates the runtime contract. Builtins follow ordinary lookup and shadowing: locals, module declarations, and explicit imports can shadow them, while native namespace wildcards do not shadow known builtins. Using one as a value requires concrete `fn(...) -> void` context.

## Reported locations

Failure reports include the original .cv display location, the operation name's one-based line number, operation kind, and optional runtime message. When used as a callable value, location refers to the builtin binding expression. Direct check/require also report the complete condition's UTF-8 source bytes, including parentheses, whitespace, newlines, and comments. fail has no condition fragment. The reporter decides final presentation.

## const test

```carven
const fn square(value: i32) -> i32 => value * value;

const test "square at compile time" {
    check(square(6) == 36);
    println("checked");
}
```

const test executes once after its body is built during semantic analysis, independently of test-artifact options. It uses the constant-execution admission subset, allowing direct const fn calls, printing, and test operations. Inactive branches are also checked for admission. Each test has independent storage and budgets. Execution follows batch module order and source order within modules. Passing const tests produce no runtime test functions or runner entries.

A failed check is a compile error but continues the current test. A failed require/fail, execution error, or exhausted budget stops that test; subsequent const tests still run. Failure message text counts toward cumulative text work. An ordinary required constant initializer has no active test, so executing test operations there is rejected.

Constant tests validate compile-time semantic operations. Runtime tests validate generated C++ and native behavior.
