---
title: "Entry points and testing"
description: "Entry selection, process status, assert, check/require/fail, test reports, and test-stop propagation."
section: reference
lesson: 18
source: docs/language/execution.md
---

## Entries

A module has at most one program entry: a function named `main` or top-level executable statements. Checking and C++ generation may process several modules with independent entries in one batch. Each executable links one entry and its dependencies; interpreted program execution requires exactly one entry across its inputs.

Top-level statements form an implicit entry in order, with declarations allowed among them. Top-level `const` bindings remain module constants; constant blocks execute during analysis and do not form an entry; `let`/`var` are entry locals that module functions cannot capture. An implicit entry has no source callable name, parameters, or declared failure set; it infers outward failures from its body, like a private function without a throw clause. It follows ordinary function-body inference, access, cleanup, and failure-handling rules, so top-level statements may propagate with `?`:

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

Native execution prints `42`, then reports the escaped failure type and structural payload on `stderr` and exits with `EXIT_FAILURE`. `carven interpret` prints `42`, then reports the same payload under `CV-INTERPRET-EXECUTION` at the throw location with its call path.

An explicit main is selected regardless of module path, craft, or visibility. It may have no parameters or one unannotated Read command-line parameter. The wrapper owns a Vector<String> of arguments excluding the executable name; the parameter borrows it and supports ordinary indexing, iteration, printing, and views. Synchronous and async entries retain the owner until execution and lexical child closure complete. Ordinary function parameters still require types.

On Windows, the native entry reads wide-character arguments from the C runtime
and converts them to UTF-8. On POSIX, arguments passed to Carven must already be
valid UTF-8; invalid text terminates the native program. Empty arguments are
preserved.

Use the unannotated parameter to receive command-line arguments:

```carven
fn main(args) {
    for argument in args {
        println(argument);
    }
}
```

Save this as `main.cv` and run `carven run main.cv -- alpha beta`. It prints `alpha` and `beta` on separate lines.

An explicit main with outward failures requires a throw clause, including private main; omission reports `CV-EFFECT-THROW-PUBLISHED`. Normal completion produces process status zero; a Carven return value is not the status. A typed failure escaping either entry produces C++ `EXIT_FAILURE` and one `stderr` report containing its type and structural payload. Ordinary local cleanup completes first; the wrapper retains the payload through reporting and destroys it before exit. Native reports point to the entry declaration because failure values carry no source location. Catching the failure and completing normally gives zero and no failure report.

## Test declarations

`test "name" { ... }` and `test { ... }` declare module-local bodies without parameters or a result. The name is optional; an explicit name is unique within the module and cannot be main. Reports identify an anonymous test by its file, line, and column. Tests are parsed and semantically checked regardless of requested test artifacts and must not expose escaping failures.

```carven
fn add(a: i32, b: i32) -> i32 => a + b;

test "addition" {
    check(add(20, 22) == 42);
}
```

`carven test [target]` builds native runtime tests through the current directory's `build.cv`; omitting the name selects all targets. Targets without runtime tests skip native test compilation. `carven interpret --tests main.cv` directly runs supported runtime tests, requires at least one, and skips the program entry. `check` and ordinary compilation analyze runtime tests without running them. `compile --tests` emits tests, a runner, and a test entry while suppressing the program entry wrapper. `--tests=runner` retains that wrapper and emits tests and a runner; the consumer selects its entry. Generation allows an empty suite.

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

All four operations return `void`. A condition must be `bool`; an optional message is `str` or `String`. For check/require/fail, argument count, condition type, and message type errors use `CV-TEST-ARGUMENT-COUNT`, `CV-TEST-CONDITION-TYPE`, and `CV-TEST-MESSAGE-TYPE`. For assert, they use `CV-TYPE-CALL-ARITY`, `CV-TYPE-CONDITION-BOOL`, and `CV-TYPE-MISMATCH`.

Direct assert, check, and require calls evaluate their condition exactly once. Only a false condition evaluates the optional message, once and after the condition. fail always evaluates its message. Skipped messages are still type-checked. A builtin bound to a callable value keeps ordinary eager argument evaluation at the indirect call site.

A failed check reports and continues. A failed require or fail reports and stops the entire current test, including nested Carven helpers and views. Test stopping differs from return, break, and typed failure; try cannot catch it. After ordinary cleanup, the runner proceeds to the next test. This propagation cannot cross arbitrary native C++ callbacks.

The runner supplies test context for check/require/fail to the Carven call chain without a source context argument, including across await and synchronous or async helpers. Calling them at runtime without an active test violates the runtime contract. Builtins follow ordinary lookup and shadowing: locals, module declarations, and explicit imports can shadow them, while native namespace wildcards do not shadow known builtins. Using one as a value requires concrete `fn(...) -> void` context.

## assert

assert needs no test context and is always enabled, independently of native build configuration and `NDEBUG`. It is not a typed failure, and try cannot recover it.

| Where it fails         | Result                                                                         |
| ---------------------- | ------------------------------------------------------------------------------ |
| Native program or test | Reports to `stderr` and aborts the process without ordinary stack cleanup      |
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

The native executable prints `1`, then reports on `stderr` and aborts (child status 134 on POSIX, from `SIGABRT`). `carven run main.cv` reports that child failure as a build error and returns 1:

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

`carven interpret --tests main.cv` prints the following report on `stderr` and returns 1. In a project whose `build.cv` selects this file as a source root, `carven test` reports the same test failure:

```text
main.cv:9:5: error: check failed
  test:
    module: main
    name: main.cv:7:1
  condition: total == 5
  operands:
    total: 4
  message: total mismatch

carven: tests: 1 passed; 1 failed
```

Reports appear when the operation fails. Successful cases have no individual report, and several failed checks in one test count as one failed case. The run finishes with `carven: tests: N passed; M failed` on `stderr`; program printing keeps its original stream. A final note identifies a stopped test or aborted execution. Native custom reporters control their own output and receive no default summary. Compile-time diagnostics keep their error codes and source excerpts and use the same condition, operand, and message layout.

## Assertion explanations

A direct assert/check/require whose outer condition is a Carven comparison reports operand spellings and structural values on failure. An outer `&&` / `||` reports its Boolean subexpressions, marking skipped operands `<not evaluated>`. Operands whose displayed values repeat their source spelling, such as literals, are omitted; if none remain, there is no operands field. Parentheses preserve this behavior; indirect calls and other conditions retain condition/message reporting. Explanations do not recursively trace operations or find the first differing field.

Collection reuses the original evaluation without repeating operands or invoking formatters, preserving order, snapshots, short circuiting, propagation, and cleanup. Failed values render before the optional message expression, so its mutations cannot change the explanation; successful conditions do not render values. A runtime reporter receives a borrowed explanation string valid only during the synchronous callback. Static-test diagnostics include the same explanation.

## Runtime traps

Integer division or remainder by zero, invalid shift counts, out-of-bounds indexing, and invalid checked scalar conversion report the operation’s source position, active test context, and `note: execution aborted`. Index traps also show index and length. Generated and interpreted checks use the Carven location; direct native support calls use the C++ position provided by their API. A trap aborts the whole interpreted run, including remaining tests, with no completion summary. Traps and assertions are distinct from recoverable test stops and typed failures.

## `const test`

```carven
const fn square(value: i32) -> i32 => value * value;

const test "square at compile time" {
    check(square(6) == 36);
    println("checked");
}
```

`const test` and anonymous `const test { ... }` execute once after the body is built during semantic analysis, independently of test-artifact options. The body uses the constant-execution subset, including direct `const fn` calls, calls through local bindings of named `const fn`, printing, and test operations. Unsupported operations are diagnosed when executed. Each test has independent storage and budgets. Execution follows batch module order and source order within modules. Passing `const` tests produce no runtime test functions or runner entries.

A failed check is a compile error but continues the current test. A failed require/fail, execution error, or exhausted budget stops that test; subsequent `const` tests still run. Failure message text counts toward cumulative text work. An ordinary required constant initializer has no active test, so executing test operations there is rejected.

Constant tests validate compile-time execution. Runtime tests execute either as generated native code or within the interpreter subset. Use native execution to cover C++ integration; interpretation does not validate generated C++ or native linking.

## Async tests

`async test` awaits operations and starts lexical children directly. The runner executes tests sequentially; each test owns a root that closes its children before the next test. `check`, `require`, and `fail` keep their active test context across await and synchronous or async helpers. Failed `require` or `fail` stops the root and children, releases local values, then proceeds to the next test. Root cancellation marks the test as failed. No test may declare outward failures; synchronous runtime tests cannot await.

```carven
import std::async using yield_once;

async fn answer() -> i32 {
    await yield_once();
    return 42;
}

async test "child completes" {
    async let child = answer();
    check(await child == 42);
}
```

`const test` and `const async test` execute during analysis and both admit supported static asynchronous operations. Either modifier order parses; use `const async test` as the canonical spelling. `carven test [target]` builds and runs project test blocks through `build.cv`. `carven interpret --tests main.cv` runs supported runtime tests directly without native compilation.
