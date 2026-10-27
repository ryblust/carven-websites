---
title: "Constants and compile-time computation"
description: "Constant facts, module constants, compile-time functions, text freezing, and resource limits."
section: reference
lesson: 17
source: docs/language/constants.md
---

Use `carven check main.cv` to evaluate the static roots in each complete example. Examples with top-level runtime statements can also run with `carven run main.cv`.

## Execution stages

A program has two stages. The static stage executes during compilation; the
runtime stage is the generated program. `const fn` states that a function can
execute in the static stage. A `const` declaration, `const { ... }`, and
`const test` execute there. `const if` selects an arm and `const for` expands
iterations during compilation; their remaining statements execute in the body's
stage. A constant keeps the completed result of that execution for later use. This retention is called freezing: a String stays a String, and its bytes remain available without rerunning the initializer.

## Constant declarations

A top-level `const` creates a module-scope name for one typed constant. Use a bare declaration for constants shared within the project and `private` for a module-local helper. The `export` declaration below illustrates a public Craft API consumed from another Craft:

```carven
private const radix = 10;
const retry_limit: i32 = 3;
export const protocol_version: u32 = 1;
```

Private and bare module constants may infer a unique concrete type or state it
explicitly. An exported constant must state its type; a literal suffix in the
initializer is not a declaration annotation. Omitting that type produces
`CV-CONST-EXPORTED-TYPE`. The annotation supplies the initializer's expected
type and uses ordinary compatibility rules. The target must be a named
identifier, so top-level `const _ = ...;` is invalid.

Module-constant initialization is elaborated from resolved declaration
dependencies rather than source order. Every successful use selects the same
normalized value; a dependency cycle produces `CV-CONST-CYCLE`. A module
constant has Read access only and introduces no runtime binding, source address,
or linkage. A frozen view's contents have program-lifetime backing storage; that storage
does not give the source declaration an identity.

## Constant expression scope

Carven evaluates `const` initializers and array extents during semantic analysis.
They use ordinary expression typing, scopes, access rules, and control flow.
`if`, `match`, and `try` may directly produce their values:

```carven
const compact = true;
const width = if compact { 4usize } else { 8usize };
const table: [i32; if compact { 2usize } else { 4usize }] = [0, 0];
```

Every branch receives name, type, access, and failure checks. Branch results must have compatible types. Selecting one branch cannot select a different result type. Execution evaluates only the selected path. Branch-local bindings
and loops have their ordinary scope and lifetime. `try` can recover a source
failure before the root completes. An array extent must complete with a
nonnegative integer; a constant initializer must complete with a value that can
be frozen.

Freezing preserves the completed result's type, including owning `String` and
`Vector<T>` values and aggregate components. Unit results freeze as `void`.
Local and module constant declarations exist only in the static stage; their
later uses denote the normalized value without creating a runtime binding or
lambda capture. Retained owners and their projections have immutable
program-lifetime backing, including constants declared inside functions.
Ordinary mutable copies have their own lifetime.

A body-local `const` executes where it stands in the static stage: once for
each selected instance or expanded occurrence, and not at all in an unselected
`const if` arm or an empty `const for`.

The compiler checks types in every branch before execution. An array
extent, C++ construction type query, or separately constructed body that names
a local constant requires an admitted value independent of unbound static
parameters. These dependency queries cannot sample a host clock, read input, or
perform waiting, including through a source wrapper. They may construct
configuration or cold values without executing their host operation. This
restriction prevents type formation from repeating or prematurely performing
the local declaration's host work.

A completed module constant may supply a type dependency. When a value depends
on host state and also determines a type, compute the value in a module `const`
declaration and use that frozen result. A local `const` that needs a new host
observation can execute at its ordinary static-stage position, but type formation
cannot pre-read it. Constant value formation and type validity retain their
ordinary rules.

Ordinary conditions follow the [control-flow analysis rules](/reference/control/#order-and-inactive-code), even when their values are known. [`const if`](/reference/functions/#static-control) selects specialization explicitly.

Integer calculations and casts use the [numeric rules](/reference/types/#arithmetic-and-termination). An operation reached during required static execution reports a compilation diagnostic for division by zero or an invalid shift. Floating calculations use the compiler host's floating environment. A known runtime result does not make an ordinary function call admissible in a static root; its target must have `const fn` capability.

## Constant blocks

`const { ... }` executes a statement block during compilation. An optional
string after `const` labels diagnostics, as in `const "prepare table" { ... }`.
The label is not a declared symbol and need not be unique. A block may appear
at module scope or wherever a block accepts statements:

```carven
const {
    var total = 0;
    for index in 0..10 {
        total += index;
    }
    println(total);
}

fn resize(const width: i32) {
    const for lane in 0..3 {
        const {
            assert(width > 0);
            println(f"lane {lane} of width {width}");
        }
    }
}
```

A block at module scope executes once. A block in a function, lambda, or test
body is a block of that body's static stage, as a local `const` is a binding of
it: it executes once for each selected instance or expanded occurrence and not
at all in an unselected `const if` arm or an empty `const for`. Runtime control
does not select it, so a block in an uncalled function, a runtime branch, or a
runtime loop executes once for its body, and runtime execution never repeats it.

Blocks use the shared static-execution type and operation rules, including mutable locals, control flow, aggregates, text, `const fn` calls, and failure recovery. Type checking, ownership, and lifetime validation still apply. The Carven executor can invoke native operations only through typed bindings explicitly provided by its host; it does not compile or load C++ provider bodies. Native default construction remains unsupported.

A block has its own lexical scope. Module constants and the enclosing body's
static bindings (local constants, `const` parameters, and `const for` indices)
are available through ordinary lookup and shadowing. Runtime parameters and
locals of the enclosing body do not exist while the block executes and cannot
be read, written, or captured. Declarations and object lifetimes end within the
block. All locals inside the block are static values and execute in source
order. A local `const` is an immutable local at this stage; `const if` and
`const for` execute as `if` and `for`, including ordinary Read and Write iteration
over local values. Nested blocks can read enclosing static locals and retain
their own diagnostic labels.
These rules also apply inside `const test`; they do not change `const fn`
body specialization.

A block is not a callable: `return` cannot leave it, and `break` or `continue`
reach only loops inside it. Blocks in one body execute in source order with its
local constants. Execution order between bodies and module-scope blocks is
unspecified. Imports resolve declarations and immutable values; they do not
establish initialization ordering between blocks. Output and diagnostics are
visible to the compiler's caller and cannot be read back by another block.

Explicit `?` propagates a fallible call to the block's execution boundary.
Escaping failures, execution errors and exhausted budgets are compilation errors.
Completed output remains observable if execution or later validation fails.

`check`, `require`, and `fail` need a test: a block in a test body reports to
that test during compilation, and a block elsewhere rejects them. Blocks execute
independently of test-artifact selection, including in `check`, and produce no
runtime code or test entries.

## `const fn`

The constant initializer, const block, or const test that starts one compile-time evaluation is called its static root. Calls made during that evaluation share the root's limits. Executor admission means the operations are supported during compilation; freezing means the completed result can be retained afterwards. They are separate checks.

Static roots can call named Carven functions declared `const fn` and lambdas
whose bodies satisfy static execution requirements. This applies in local and
module constant initializers, array extents, `const` blocks, and static tests.
Arguments follow the declared type and access rules. Every function body undergoes
ordinary type, effect, ownership, and lifetime validation. A `const fn` can also run
at runtime; a runtime call remains
an ordinary call even when all arguments happen to be known.

A `const fn` can modify local state and perform supported host effects, including input, printing, clock queries, and waiting. A static root uses the compiler host's resources; an ordinary runtime call uses the program's resources. Declaring the function performs no execution.

A parameter declared `const name: T` requires an admitted constant source in every
execution mode. Executor-known values of ordinary parameters, `let`, and `var` do
not acquire that qualification.
The compiler checks the contract before execution; executing an entire function
in the static stage does not make its ordinary parameters static inputs.

Each `const fn` definition checks its semantically reachable operations for
executor capability. Reachable named source calls must select a
known `const fn`. Known lambda bodies are checked recursively under the same
rules. An unknown callable-view parameter does not establish static capability.
Unsupported operations or unproven callees produce `CV-CONST-ADMISSION` at the
definition.
Operations after an unconditional return still receive ordinary semantic checks
but need no executor capability. Paths
selected by call arguments remain part of the definition's capability check.

A static root can call a parameterized `const fn` once its type and failure-set
arguments close to concrete contracts. Inferred contracts complete their
transitive declaration dependencies before execution; an unfinished failure set
is not an empty set. A body-local `const` initializer inside a checked generic
definition cannot require an unresolved generic environment. It has no deferred
parameter-dependent execution at concrete application time. The containing
`const fn` may still execute ordinary generic calls after its arguments close.

Execution checks budgets and dynamic errors; completion checks whether the result can freeze. Calls within one static root share its budgets. Completed host effects remain observable after a later failure. The budgets bound execution steps and construction work, but impose no elapsed-time limit on input or waiting.

Cold input and time operations retain arguments at construction. Awaiting or starting an operation performs its read or wait. A cold operation is local execution state and cannot freeze as a module constant. See [async operations](/reference/async/), [time](/reference/time/), and [input and output](/reference/io/) for the admitted host operations and their failure contracts.

```carven run
const fn label(count: i32) -> String {
    var result = String {};
    for index in 0..count {
        result.append_format(f"{index:02}");
    }
    return result;
}

const name: String = label(3);
const view: str = name;
println(view); // 000102
```

### Admitted operations

The following operations can execute in a static root, subject to their ordinary type, access, failure, and lifetime rules:

| Values or control                           | Supported work                                                                                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scalars and unit                            | Arithmetic, comparisons, logical operations, casts, and `void` values in parameters, results, and aggregates                                                                    |
| Control flow                                | `if`, `match`, `while`, C-style and iteration loops, `return`, `break`, and `continue`; recursion within the execution budget                                                   |
| Structs, classes, tuples, enums, and arrays | Construction, field or element access, admitted mutation, copying, whole-owner Take, parameters, and results; equality where the type supports it                               |
| `Vector<T>`                                 | Literal and empty construction, copying from slices, indexing, iteration, whole-owner Take, slicing, `push`, `remove`, `clear`, capacity construction, queries, and reservation |
| Text                                        | Owning construction, `as_str`, byte and character views, byte indexing and byte/character iteration, `append`, `append_format`, `push`, `clear`, and supported interpolation    |
| Slices                                      | Queries, indexing, subslicing, iteration, and borrowing live array or Vector backing                                                                                            |
| SIMD                                        | Operations admitted by the [SIMD execution contracts](/reference/simd/)                                                                                                         |
| Calls                                       | Known `const fn` targets, their local bindings, statically admitted lambdas, and admitted built-in operations                                                                   |

Construction evaluates initializers in source order. Empty array literals require an expected element type. Nested fields, elements, and enum payloads must support execution. Class operations retain their private representation permissions and require `const fn` capability. Existing opaque native values can pass through functions and aggregates without invoking a native operation. Reached native calls, member access, and conversions require explicit host bindings; C++ `constexpr` alone does not supply one. Opaque native values cannot freeze as constants.

Read arguments containing array, Vector, or String storage observe their contents after all arguments have evaluated. Other supported values are snapshotted at their argument position. Interpolation holes follow the same order: owning String operands are read after all holes complete, and borrowed views keep their backing protected. See [Read values and aliases](/reference/ownership/#read-values-and-aliases) and [formatting](/reference/formatting/).

`char::from_u32_unchecked` can execute here, but its operand must be a Unicode scalar. Surrogates and values above U+10FFFF produce `CV-CONST-EVALUATION` when reached.

### Pointers and callable views

Local pointer creation, Read and Write calls, and dereference of live local targets are supported. The evaluator tracks local object lifetimes across calls and scopes. Dereferencing after a target's scope ends or after Take produces `CV-CONST-EVALUATION`; assigning new storage to a Taken owner does not revive the old address. Assignment to a live owner preserves its identity. Non-null local pointers cannot freeze as constant results.

Erased pointer formatting produces `const@nonnull` or `const@null`. These strings can freeze as ordinary text. Non-null erased pointers, including erased C string pointers, remain local execution values.

Static and interpreted execution support closure owners, value and Write captures, callable views, and failure widening. Copies retain value snapshots and Write aliases; widened views borrow their source storage and observe later rebinding. Array adaptation applies elementwise. Calls select a closure's object before arguments; every capture use reads the object's current value or Write target. Closure owners and views remain local to execution and cannot freeze, while their completed invocation results follow ordinary constant-value rules.

Standard filesystem, process, and compiler operations marked `const fn` execute through the compiler host. They observe its working directory and environment and perform effects in the selected stage. Native handles and intermediate results stay local to execution and cannot freeze. Analysis that permits host effects records them as uncacheable; type dependency queries reject host observations.

## Compile-time failure contracts

Typed failure contracts use the ordinary language rules during static execution:
`throw` creates a typed payload, `?` propagates it, and `try/catch` matches its type
and payload. Guards, alternatives, nested recovery and `rethrow` work with the
same execution machinery as calls and control flow. Catch bindings and the original failure follow the [ordinary payload access and lifetime rules](/reference/failures/#rethrow-and-lifetimes). Failure payloads can contain owning text and supported aggregates.

At a `const` initializer or array extent, `fallible()?` explicitly
propagates to the evaluation entry: a successful result can form the constant;
an escaping failure produces a diagnostic at its throw site with call context.
An unmarked fallible call remains invalid even when it succeeds during evaluation,
and `?` on a failure-free expression remains invalid. Inferred contracts are
validated by the same failure solver as ordinary bodies. `const test` retains its
static rule that no typed failure may escape the test. Evaluator errors, exhausted
budgets and failed test assertions cannot be caught as typed failures.

## Constant results and storage

Freezing preserves nominal identity, field types, array extents, tuple arity and nesting, and owning String and Vector components. A completed Vector retains its contents and capacity. Copying a retained owner creates independent storage under the ordinary ownership rules.

A constant initializer can retain a borrowed `str` or character view while its
backing remains alive. The completed view keeps its type and selected UTF-8
contents in immutable program-lifetime storage:

```carven
const letters = String::from_str("aé我").chars;
```

Ordinary borrowed views follow their source lifetime; a view into a function's
ordinary local owner cannot escape that function. Freezing requires live backing
when the initializer completes.

A constant initializer can retain a completed array or Vector as `[T]`,
using an explicit annotation or `slice()`:

```carven
const table: [i32] = [2, 4, 6];
const middle = table.slice(1, 3);
const count = middle.length();
fn table_view() -> [i32] => table;
```

The elements have program-lifetime backing storage, so these views can be copied, stored,
and returned independently of the scope containing their constant declaration.
The declaration and its backing have no source-level address identity; native
code must not rely on different uses or generated artifacts sharing an address.
Empty slices retain their element type. Indexing and half-open subslicing are
checked during static execution; invalid evaluated bounds produce a diagnostic.

Elements must be admitted during static execution and freeze without changing
their declared type. Element types are preserved:
`[Entry; N]` becomes `[Entry]`, and `[[i32; 2]; N]` becomes `[[i32; 2]]`.
Struct fields keep their declared types. There is no recursive conversion of
owning fields or nested arrays to views. Slice comparison remains unsupported.

Array and Vector results of static function calls can reach this initializer
boundary.
During static execution, slice parameters, locals, indexing, and subslicing
borrow live backing storage. Copies and chained slices retain that backing
relationship; they do not extend its lifetime. A completed static root freezes
the selected elements into immutable program-lifetime backing before releasing the
evaluation storage.
Ordinary runtime array/Vector-to-slice conversions still borrow their source storage;
known contents alone do not extend that storage's lifetime.

Retaining an array or constructing a constant subslice counts element references toward the [execution budgets](#execution-budgets).

## Execution budgets

Calls in one static root share these limits:

| Limit                                     | Value     |
| ----------------------------------------- | --------- |
| Execution steps                           | 1,000,000 |
| Nested calls                              | 128       |
| One text value                            | 1 MiB     |
| Accumulated text construction and copying | 8 MiB     |
| Nested slots in one aggregate             | 65,536    |
| Aggregate levels                          | 64        |
| Accumulated slot constructions and copies | 524,288   |

Slots include sequence and tuple elements, struct fields, and enum payloads. Appending charges added bytes; queries do not copy their receiver. Retained arrays and constant subslices charge their element references. These limits measure work rather than live memory. Format specifications also have a nesting limit.

Exhaustion fails compilation with `CV-CONST-LIMIT`; execution errors use `CV-CONST-EVALUATION`, and definition capability errors use `CV-CONST-ADMISSION`. A required static computation must complete within its limits. Type, arithmetic, and dependency diagnostics also apply.
