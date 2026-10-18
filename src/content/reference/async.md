---
title: "Async operations and child tasks"
description: "Create and combine async work, manage child tasks, and handle cancellation and closure."
section: reference
lesson: 27
source: docs/language/async.md
---

An async function describes work that may wait, such as reading input or sleeping until a deadline. Calling it creates an operation; awaiting that operation runs the work and receives its result. Use a child task when work should start before you await its result.

## Cold operations and await

Import `Operation` and async callables from `std::async`; see [module bindings](/reference/modules/#standard-modules-and-defaults). An inferred operation needs no type-name import. The keywords `async`, `await`, and `cancel` need no import.

An operation is **cold** until started: creating it does not execute the async function body. `await operation` starts it and waits for completion. `async let child = operation;` starts a child whose lifetime is tied to the surrounding scope. That scope finishes the child before releasing the values it needs.

```carven run
import std::async using yield_once;

async fn next(value: i32) -> i32 {
    await yield_once();
    return value + 1;
}

async fn main() {
    let operation = next(4);
    println(await operation);
    async let child = next(8);
    println(await child);
}
```

The function's `-> T` is its successful completion type; its declared `throw` set is delivered when awaited. Use `Operation<T>` for an operation without nominal failures, or `Operation<T, throw Error + OtherError>` for its full contract. Matching success types and final failure sets give operations the same type, even when different functions produce them.

Inside a parameterized declaration, `Operation<T, throw E>` separates the success type from a failure-set parameter. The set contains copyable nominal payload types and may be empty; see [failure-set parameters](/reference/failures/#failure-set-parameters).

`Operation<void, throw ()>` and `Operation<void>` both complete successfully with
the unit value `()` and have no nominal failure alternatives. Cancellation remains a separate completion: it has no failure payload type for a typed catch arm.

`await` starts and consumes an operation exactly once. A direct await executes a
dependency in the current logical task; it does not implicitly yield. Execution
continues until the dependency actually suspends or completes. A named operation
does not need `&&` for await or child startup. Ordinary ownership transfer still uses
`&&`. Operations cannot be copied or captured. Ordinary owning bindings,
assignment, record fields, Tuple slots, and fixed arrays can hold and transfer
cold owners under the same Take and lifetime rules.
An unused named cold owner is destroyed at scope exit without executing its body.
A bare cold-operation expression statement, such as `next(4);`, is rejected.
Synchronous functions may accept and return typed cold owners when analysis can
prove their retained backing remains valid. Use a Take parameter to transfer
the complete owner:

```carven
import std::async using Operation;

fn relay(&&pending: Operation<i32>) -> Operation<i32> => &&pending;
```

An async successful result cannot itself contain an operation.

`await action()?` awaits completion before propagating its nominal failure.
Ordinary `try`/`catch` handles those declared failures. Cancellation is a separate
completion and does not add a nominal type to the failure set. Use await in async bodies, constant initializers, const blocks, and compile-time tests. Structured expressions,
arguments, returns, and loop steps may contain await and preserve source evaluation order.

Postfix calls, member access, and indexing belong to the await operand. Group an await result before using those operations on its successful value: `(await action()).member`. In `await action().member`, `.member` instead selects part of the operand before awaiting it. A trailing `?` is outside the await operand: `await action()?` propagates the completed operation's failure. Grouping changes that boundary: `await (action()?)` propagates a failure from constructing the operand, then awaits the operation it returns. See [await grammar](/reference/grammar/#72-prefix-expressions).

## Cold composition

The builtin composition operations `when_all`, `when_any`, and
`first_successful` are imported from `std::async` and use ordinary name lookup. Each takes
cold operations and returns a cold operation. They require a direct call and
cannot be used as callable values.

Using the `next` definition above, replace the entry with:

```carven
import std::async using when_all;

async fn main() {
    let (first, second) = await when_all(next(4), next(8));
    println(first, second);
}
```

| Operation                     | Successful result            | Selection                   |
| ----------------------------- | ---------------------------- | --------------------------- |
| `when_all(a, b, ...)`         | `(A, B, ...)` in input order | Every input succeeds        |
| `when_any(a, b, ...)`         | `(usize, T)`                 | First terminal completion   |
| `first_successful(a, b, ...)` | `(usize, T)`                 | First successful completion |

Join preserves nested products and unit slots. An empty join succeeds with `()`;
one input produces a singleton Tuple. Selection requires at least one input and
a common successful type. Its index identifies the original input position.
Failure sets contain the union of the input failures; cancellation is separate.

Inputs are evaluated and transferred once in argument order. Stored operations
require Take (`&&`); lexical children cannot be passed. Construction retains the
inputs' backing without starting them. Discarding the unstarted composite
destroys its inputs without executing them. A later input-expression failure
also destroys the earlier inputs without starting them.

At execution, all inputs start in argument order before the queue runs any child.
If candidates have already completed, selection follows input position. Otherwise the first reported completion determines the selection. Join requests sibling cancellation after
a selected failure or cancellation. Its first selected nominal failure commits
the outward failure. Child cancellation keeps selection open for a nominal
failure; without one, the closed group completes as cancelled.

`when_any` commits the selected terminal completion. `first_successful` continues
after failed or cancelled candidates. If none succeeds, it forwards the first
selected nominal failure, or cancellation if every candidate cancelled.

A pending parent cancellation is accepted before startup and before outward
commitment. Every composite closes its children before delivering the selected
outcome. Cancellation requests alone do not release borrowed backing. After
commitment, later cancellation and loser failures do not replace the outcome.
Result assembly follows ordinary value-transfer requirements.

## Lexical children and cancellation

`async let child = operation;` queues the operation's initial execution at the
same-thread loop tail and gives the current lexical scope responsibility for its
lifetime. A child cannot be copied or transferred. It may be awaited once. Every normal
path out of its owning scope must observe it, close it, or use `cancel child;`.

`cancel child;` makes an idempotent cancellation request and returns immediately.
It does not release retained backing. Scope closure waits until its children have
finished before destroying their backing or completing the parent. On failure or
cancelled exits, closure requests cancellation automatically. Return and other
exit operands are evaluated before closing children; taking retained backing in
such an operand remains invalid. A callee has its own child scope and does not
wait for siblings started by its caller, even though direct awaits share the
same logical cancellation task.

`cancel` is a reserved keyword. Inside an async body using `next` above, request cancellation of a named lexical child:

```carven
async let child = next(8);
cancel child;
```

It cannot be used as a callable, shadowed by a bare source name, or applied to a
cold operation. Parenthesized operands and arbitrary expressions are not admitted.

Import the following callables from `std::async`:

| Operation                              | Behavior                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `cancel_requested() -> bool`           | Read the current task's request; false outside async execution                                                      |
| `cancel_point() -> Operation<void>`    | Cold void operation accepting a pending request as cancelled completion                                             |
| `yield_once() -> Operation<void>`      | Cold void operation that queues the current task continuation at the FIFO tail when executed                        |
| `await wait_ready(first, second, ...)` | Wait for a child's terminal completion; return its input position and committed cancellation bit as `(usize, bool)` |
| `await close(child)`                   | Request cancellation, wait for completion, discard its outcome, and release its active backing loan                 |

These helpers have no declared failures. Each async builtin requires a direct call; taking one as a callable value, capturing it, or passing it as a function argument is rejected. Names follow ordinary lookup and [native import conflict rules](/reference/interop/) in both synchronous and async bodies.

Constructing a cold yield or cancellation checkpoint does not execute it. The
checkpoint reads the request when started or awaited. Yield does not implicitly
accept cancellation. A synchronous helper called by an async body observes that
body's cancellation context. Cancellation is cooperative: a child that never
reaches an accepting operation can delay scope closure.

## Terminal waiting and explicit closure

`wait_ready` and `close` require direct `await` operands and named lexical
children belonging to the current activation. They cannot be stored as operations or callable
values. Candidates may have different result types and declared failure sets.

Place the import at the module start and the following statements inside an async body, using `next` above:

```carven
import std::async using { wait_ready, close };

async let first = next(4);
async let second = next(8);

let (index, cancelled) = await wait_ready(first, second);

if index == 0 {
    await close(second);
    if cancelled { await close(first); } else { println(await first); }
} else {
    await close(first);
    if cancelled { await close(second); } else { println(await second); }
}
```

`wait_ready` requires at least one candidate. Each must be definitely unconsumed;
duplicates and candidates consumed on only some paths are rejected. Waiting
borrows children and does not consume a result, release backing, or satisfy
normal-exit observation. Repeated waiting may select the same child.

The index and cancellation bit describe the same terminal snapshot. A false bit
means success or nominal failure; ordinary await receives that outcome. If any
candidates are already terminal, the lowest input position wins. Otherwise the
first terminal publication commits the selection, even if other children finish
before the parent resumes.

`close` discards success, nominal failure, or child cancellation. After draining,
the child is consumed and its active loan closes. Closing an already consumed
child is a no-op, including after conditional observation. A cold operation is
not a valid operand.

Neither operation stops because its parent receives a cancellation request. The request remains visible. Closure waits for completion and for native callbacks to stop accessing the operation's state. Neither suppresses
traps, execution limits, or native protocol violations. Noncooperative children
can delay either operation indefinitely. Static execution follows these same
selection and closure rules.

## Retained access and admission

An operation can use its inputs after construction. Cold operations and active children therefore keep borrowing the input storage they need.
Write access remains nonexclusive and mutation of admitted value slots may continue; taking or
reconstructing retained owner storage is rejected until its loan closes. A
cancellation request alone does not close that loan. Receiving the completed result releases the child's active borrowing constraints. Its scope still manages the child state.

Async inputs admit scalar, SIMD vector, mask, and unit values by Read or Write,
recursively pure Carven aggregate/enum Read, owning Take values without external
referents, and opaque native Read holders, also when contained in Carven aggregates.
Read snapshots the builtin values when the cold operation is constructed;
Write retains their original slots. Native Read borrows
retain the source holder through the same lifetime loan as cold Write; taking or
replacing it before completion or closure is rejected. Cold native borrows require
known source backing, such as a named holder. Opaque native temporaries and
reference query results do not establish that backing. Borrowed text, slices,
pointers, and callable views are excluded. Unknown native owning
Take inputs are also excluded.

Parameterized async functions obey these same rules. Known invalid shapes are
rejected when the definition is checked, including borrowed fields inside a
parameterized record or Tuple. A requirement depending on an unknown type
parameter is checked again against each concrete instance. An unknown type does
not establish Copy or independent backing. Known invalid arguments and completion
types at an async call inside a parameterized function are rejected even if that
function is never instantiated.

The optional command-line parameter of `async fn main(args)` is a Read borrow
of the entry wrapper's `Vector<String>`. The wrapper retains that owner until
the root and its children close. Ordinary async Read parameters follow the
owning-value restrictions above.

Native local operations follow the ordinary declared interoperation contract.
Carven checks source-visible loans, destructive access, and escaping backing.
Native Write is checked as potentially invalidating its selected storage. Native
providers own hidden referent lifetimes, retention, reentry, and value
validity. The compiler does not inspect native implementation code. Result storage
supports immovable values in place and preserves observable source transfer and
cleanup.

Executed synchronous helpers in an async body may not transitively stop a test
through `require` or `fail`. Constructing a cold operation is distinct from
executing its body for this effect check.

The driver is single-threaded and nonreentrant, with bounded native stack use for
deep await chains. Scheduling is cooperative, without fairness or cancellation
latency bounds. An async entry's wrapper drives the root through child closure
before reporting its outcome.

Async tests, class receivers, async callable values, arbitrary external awaitable
types and cross-thread resume remain outside this admission boundary.

## Static parameters and execution

Async source functions can declare `const name: T` parameters. Each call supplies
an admitted static value, evaluated and frozen during specialization. These values
select a checked residual body; generated calls and cold captures contain only
runtime inputs. Every instance retains the source function's result and failure
contract.

`const async fn` also admits execution in the static stage:

```carven
const async fn next(value: i32) -> i32 => value + 1;
const answer = await next(4);
```

Construction evaluates inputs once and stores a cold operation; await consumes
it and executes its body in the same semantic execution domain. Stored operations,
unused cold owners, Write access to live local backing, and nominal failure
propagation follow the ordinary ownership and evaluation rules. A private
synchronous `const fn` may return an inferred cold operation. Its ordinary body
cannot use await; static roots, `const` blocks, and `const test` bodies can.
Operations are execution-local values and cannot be frozen as constants.

During compile-time execution, source calls must target const functions. Lexical children and async builtins use the same execution rules. Child startup and explicit yield use a FIFO queue; a direct await
remains in the current task. Cancellation is requested separately from acceptance
at a checkpoint. Children close before their borrowed local backing is released,
using the same source rules as runtime execution.

All tasks in a static root share its execution limits and memory domain. Builtin
input, clocks, and waits use the compiler host and the ordinary cold-operation,
cancellation, and failure contracts. Native C++ provider bodies remain outside semantic
execution capability. Runtime calls to the same source definition use C++ coroutines.

## Native providers and hosts

`import(cpp) async fn` declares a native function that returns a cold
`carven::runtime::execution::AsyncOperation<Result, Failures...>`. Its source result and
failure declarations describe completion, not operation construction. Native
imports undergo the same async signature checks even without a source body.
`export(cpp) async fn` exposes a source async function through its module's existing
C++ API header with the same cold AsyncOperation representation.

A native host owns its event source and provider resources, passes an explicit
context to the exported root, and calls `drive_root(operation, &source)`. Context
Read is a const-reference borrow. The native caller keeps its holder and hidden
resources alive until the cold owner is dropped or execution and child closure
finish. Source loans check the holder; they do not prove native fd, buffer, or
callback lifetimes. The provider maps events to Completion, releases external
reachability, and queues the existing continuation before source execution resumes.
Requesting cancellation does not mean callbacks have stopped. Keep the provider's state alive until no pending or running callback can access it.
Native provider awaiters use `ResumeContinuation` from the execution core,
`carven/runtime/execution/execution.hpp`.
They bind the suspended coroutine, query its cancellation request, and enqueue
resumption through the supplied driver after committing completion. The provider
keeps the continuation alive through dispatch and performs event delivery on the
driver thread. The host source derives from `EventSource` and implements
`poll(Driver&) noexcept` and
`wait(std::optional<std::int64_t> deadline) noexcept -> bool`. Polling commits
ready completions and queues their continuations. Waiting returns false when
there are no pending native requests; otherwise it waits for readiness or the
supplied steady-clock nanosecond deadline and returns true. These methods run
on the driver thread and do not resume source code directly.

The driver services registered event sources and builtin timers through one
polling and waiting loop. A single source waits directly until readiness or the
nearest timer. With multiple independent sources, waits are capped at ten
milliseconds so each source can be polled. Standard input registers its source
while reads are pending. `drive_root` borrows the host source through root and
child closure, then detaches it. Providers using `Driver::attach` and `detach`
keep their source alive throughout that registration. Native requests use
`TaskContext::request_cancel()` on the driver thread so parked timer cancellation
is notified.

Successful `char` values received by await are checked as Unicode scalar values,
including discarded awaits and direct completion returns. Failure and cancelled
completion transfer before that value check. Destroying an unstarted cold owner
does not receive a result.

Composition checks each selected successful `char` input before retaining it in
a product or committing a result. This also applies to discarded products and
joins whose later inputs fail. Native C++ types keep their declared native contract.
