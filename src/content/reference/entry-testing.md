---
title: "Entries, runtime tests, and compile-time tests"
description: "Entry selection, process status, assert, check/require/fail, test reports, and test-stop propagation."
section: reference
lesson: 14
source: docs/semantics.md
---

## Entries

A compilation batch has at most one program entry: either a function named main or a file containing top-level executable statements. Multiple entries are diagnosed at their source locations. C++ generation may have no entry, but program execution requires one.

Top-level statements form an implicit entry in order, with declarations allowed among them. Top-level const bindings remain module constants; constant blocks execute during analysis and do not form an entry; let/var are entry locals that module functions cannot capture. An implicit entry has no source callable name, parameters, or declared failure set; it infers outward failures from its body, like a private function without a throw clause. It follows ordinary function-body inference, access, cleanup, and failure-handling rules, so top-level statements may propagate with `?`:

```carven
struct Missing {}

fn load(ready: bool) -> i32 throw Missing {
    if !ready {
        throw Missing {};
    }
    return 42;
}

println(load(true)?);
println(load(false)?);
println("not reached");
```

Native execution prints `42` and exits with status 1 when the second failure escapes. `carven interpret` prints `42`, then reports `CV-INTERPRET-EXECUTION` for the escaped failure.

An explicit main is selected regardless of module path, craft, or visibility. It may have no parameters or one unannotated Read command-line parameter. That parameter is an entry-specific opaque value, not an indexable or iterable sequence. Ordinary function parameters still require types.

An explicit main with outward failures still requires a throw clause, including private main; omitting it reports `CV-EFFECT-THROW-PUBLISHED`. Normal completion produces process status zero; a Carven return value, even an integer, is not the status. A typed failure escaping either kind of entry produces C++ EXIT_FAILURE without automatically printing its payload or becoming a C++ exception. Ordinary local, result, and payload cleanup still occurs. Catching the failure and completing normally gives zero.

## Test declarations

`test "name" { ... }` and `test { ... }` declare module-local bodies without parameters or a result. The name is optional; an explicit name is unique within the module and cannot be main. Reports identify an anonymous test by its file, line, and column. Tests are parsed and semantically checked regardless of requested test artifacts and must not expose escaping failures.

```carven
fn add(a: i32, b: i32) -> i32 => a + b;

test "addition" {
    check(add(20, 22) == 42);
}
```

`carven --tests` runs native runtime tests; `carven interpret --tests` runs admitted runtime tests. Both require at least one runtime test and skip the program entry. check and ordinary compile only analyze runtime tests. `compile --tests` / `--tests=default` emits module tests, a runner, and a default test entry while suppressing the program entry wrapper. `--tests=external` retains that wrapper and emits tests and a runner; the consumer owns entry selection. Generation allows an empty suite.

## Test operations

```text
assert(condition);
assert(condition, message);
check(condition);
check(condition, message);
require(condition);
require(condition, message);
fail();
fail(message);
```

A condition must be bool; an optional message is str or String. For check/require/fail, argument count, condition type, and message type errors use `CV-TEST-ARGUMENT-COUNT`, `CV-TEST-CONDITION-TYPE`, and `CV-TEST-MESSAGE-TYPE`. For assert, they use `CV-TYPE-CALL-ARITY`, `CV-TYPE-CONDITION-BOOL`, and `CV-TYPE-MISMATCH`.

Direct assert, check, and require calls evaluate their condition exactly once. Only a false condition evaluates the optional message, once and after the condition. fail always evaluates its message. Skipped messages are still type-checked. A builtin bound to a callable value keeps ordinary eager argument evaluation at the indirect call site.

A failed check reports and continues. A failed require or fail reports and stops the entire current test, including nested Carven helpers and views. Test stopping differs from return, break, and typed failure; try cannot catch it. After ordinary cleanup, the runner proceeds to the next test. This propagation cannot cross arbitrary native C++ callbacks.

The runner supplies test context for check/require/fail to the synchronous Carven call chain without a source context argument. Calling them at runtime without an active test violates the runtime contract. Builtins follow ordinary lookup and shadowing: locals, module declarations, and explicit imports can shadow them, while native namespace wildcards do not shadow known builtins. Using one as a value requires concrete `fn(...) -> void` context.

## assert

assert needs no test context and is always enabled, independently of native build configuration and `NDEBUG`. It is not a typed failure, and try cannot recover it.

| Where it fails         | Result                                                                         |
| ---------------------- | ------------------------------------------------------------------------------ |
| Native program or test | Reports to stderr and aborts the process without ordinary stack cleanup        |
| `carven interpret`     | Reports and stops the whole execution, including any remaining tests; status 1 |
| Compile-time execution | Emits `CV-ASSERT` and stops the current evaluation                             |

```carven
fn checked_index(index: usize, len: usize) -> usize {
    assert(index < len, "index out of range");
    return index;
}

println(checked_index(1, 3));
println(checked_index(3, 3));
println("not reached");
```

`carven main.cv` prints `1`, then reports on stderr and aborts (status 134 on POSIX, from `SIGABRT`):

```text
main.cv:2:5: error: assertion failed
  condition: index < len
  operands:
    index: 3
    len: 3
  message: index out of range
  note: execution aborted
```

The interpreted report adds `called from: main.cv:7:9` before the note. An aborted run prints no completion summary. When a native assertion fails in a test, the report includes the module and the explicit test name or source location.

## Reported locations

Each failure report starts with `file:line:column: error: description`, using the original .cv display location and the one-based line and column of the operation name. Indented fields follow: `test` (module and explicit name or source location), `condition`, `operands`, and `message` when present. Multi-line fields use an indented block; an explicitly empty message appears as `message: ""`. When a builtin is used as a callable value, the location refers to its binding expression. Direct assert/check/require report the complete condition's UTF-8 source bytes, including parentheses, whitespace, newlines, and comments; fail has no condition.

```carven
fn add(a: i32, b: i32) -> i32 => a + b;

test "addition" {
    check(add(20, 22) == 42);
}

test {
    let total = add(2, 2);
    check(total == 5, "total mismatch");
    require(total > 0);
}
```

`carven --tests main.cv` and `carven interpret --tests main.cv` print the same report on stderr and return 1:

```text
main.cv:9:5: error: check failed
  test:
    module: main
    name: main.cv:7:1
  condition: total == 5
  operands:
    total: 4
    5: 5
  message: total mismatch

carven: tests: 1 passed; 1 failed
```

Reports appear when the operation fails. Successful cases have no individual report, and several failed checks in one test count as one failed case. The run finishes with `carven: tests: N passed; M failed` on stderr; program printing keeps its original stream. A final note identifies a stopped test or aborted execution. Native custom reporters control their own output and receive no default summary. Compile-time diagnostics keep their error codes and source excerpts and use the same condition, operand, and message layout.

## Assertion explanations

A direct assert/check/require whose outer condition is a Carven comparison reports both operand spellings and structural values on failure. An outer `&&` / `||` reports its two Boolean subexpressions, marking a skipped operand `<not evaluated>`. Parentheses preserve this behavior; indirect calls and other conditions retain condition/message reporting. Explanations do not recursively trace operations or find the first differing field.

Collection reuses the original evaluation without repeating operands or invoking formatters, preserving order, snapshots, short circuiting, propagation, and cleanup. Failed values render before the optional message expression, so its mutations cannot change the explanation; successful conditions do not render values. A runtime reporter receives a borrowed explanation string valid only during the synchronous callback. Static-test diagnostics include the same explanation.

## const test

```carven
const fn square(value: i32) -> i32 => value * value;

const test "square at compile time" {
    check(square(6) == 36);
    println("checked");
}
```

`const test` and anonymous `const test { ... }` execute once after the body is built during semantic analysis, independently of test-artifact options. The body uses the constant-execution subset, including direct const fn calls, calls through local bindings of named const fn, printing, and test operations. Unsupported operations are diagnosed when executed. Each test has independent storage and budgets. Execution follows batch module order and source order within modules. Passing const tests produce no runtime test functions or runner entries.

A failed check is a compile error but continues the current test. A failed require/fail, execution error, or exhausted budget stops that test; subsequent const tests still run. Failure message text counts toward cumulative text work. An ordinary required constant initializer has no active test, so executing test operations there is rejected.

Constant tests validate compile-time execution. Runtime tests execute either as generated native code or within the interpreter subset. Use native execution to cover C++ integration; interpretation does not validate generated C++ or native linking.
