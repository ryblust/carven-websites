---
title: "Async workflows"
description: "Choose when work starts, combine results, set deadlines, request cancellation, and finish children before leaving their scope."
section: learn
lesson: 14
source: docs/language/async.md
---

## Construct work, then execute it

When work may have to wait for input or time, an async function lets other scheduled work make progress. First distinguish describing that work from actually starting it. Use `async fn main` for an entry that can await operations. Save this as async_work.cv:

```carven run
import std::async using yield_once;

async fn load_count(value: i32) -> i32 {
    println("start", value);
    await yield_once();
    return value;
}

async fn main() {
    let pending = load_count(21);
    println("constructed");
    println(await pending);
}
```

It prints:

```text
constructed
start 21
21
```

Calling an `async fn` produces a **cold operation**. Its body starts only when awaited or started as a child. `-> i32` describes the completed value, not the operation itself. Prefix `await` consumes a named operation once without an extra `&&`. Letting an unstarted operation leave its scope never runs its body. A bare `load_count(21);` is rejected because it loses an operation without naming or executing it.

In the output, constructed appears first because creating pending has not run load_count. await then starts it. yield_once gives other ready work a turn before this function continues. Awaiting a function that can finish immediately does not itself force such a turn. This is cooperative scheduling on one thread, so lengthy synchronous calculations still block other work.

`async` and `await` are language keywords and need no import. Import `yield_once` from `std::async` as shown above; it is a built-in operation whose name is not supplied by default.

## Join independent results

Replace the previous file with this complete batch program:

```carven run
import std::async using { when_all as join, yield_once };

async fn subtotal(price: i32, quantity: i32) -> i32 {
    await yield_once();
    return price * quantity;
}

async fn record_audit() {
    await yield_once();
}

async fn main() {
    let (amount, _, (second, third)) = await join(
        subtotal(1200, 2),
        record_audit(),
        join(subtotal(300, 3), subtotal(500, 1))
    );
    println(amount, second + third);
}
```

It prints `2400 1400`. Awaiting `when_all` starts all its inputs and returns results in input order. Nested joins keep their nesting. record_audit contributes `()`, so the target uses `_` for that position. The alias join selects the same builtin and completion rules as when_all.

A stored operation passed into composition uses Take, for example `join(&&pending, other())`. A cold operation can only run once. See the [operation reference](/reference/async/) when you need to name its type or store it.

## Select a result from alternative sources

Try two candidates when either can supply the result. Choose `when_any` to accept the first completion, including failure, or `first_successful` to keep waiting after a candidate fails. Save this complete program as select_result.cv:

```carven run
import std::async using { when_any, first_successful, yield_once };

struct Unavailable {
    value: i32,
}

async fn candidate(value: i32, available: bool) -> i32 throw Unavailable {
    await yield_once();
    if !available { throw Unavailable { value }; }
    return value;
}

async fn main() throw Unavailable {
    try {
        let (index, value) = await when_any(candidate(12, false), candidate(42, true))?;
        println("first completion:", index, value);
    } catch {
        Unavailable(error) => println("first result unavailable:", error.value),
    }

    let (index, value) = await first_successful(candidate(12, false), candidate(42, true))?;
    println("first success:", index, value);
}
```

Run `carven select_result.cv`. It prints:

```text
first result unavailable: 12
first success: 1 42
```

Both candidates yield once. FIFO scheduling lets the first candidate report Unavailable first. `when_any` forwards that failure to the local catch. `first_successful` instead continues to the second candidate and returns its input index and value. Indices start at zero, so `1 42` identifies the second candidate.

Both operations close their children before delivering an outcome. Their failure contracts include the candidates' declared failures, so main preserves Unavailable for the second call too. If every candidate fails, `first_successful` reports the first selected typed failure. Cancellation is a separate outcome.

## Bound a request with a deadline

Wait for load within a time limit, and use -1 if Timeout occurs. Save this separate program as deadline.cv:

```carven run
import std::time using { sleep, timeout, RangeError, Timeout };

async fn load() -> i32 throw RangeError {
    await sleep(50ms)?;
    return 42;
}

async fn main() throw RangeError {
    let result = try {
        await timeout(load(), 0ms)?
    } catch {
        Timeout(_) => -1,
    };
    println(result);
}
```

It deterministically prints `-1`: a nonpositive timeout chooses Timeout without starting load. Try `100ms` to allow it to finish; scheduling and host load can still affect which completion wins. `100ms` is a Duration literal; see the [time reference](/reference/time/) for other units and range checks.

`sleep` and timeout may fail with RangeError if deadline arithmetic is unrepresentable. The try handles Timeout and the explicit main contract preserves RangeError. `await operation()?` awaits completion first, then propagates a nominal failure. Cancellation is a separate completion, so it is not caught by naming a failure payload.

A timeout closes its protected work before delivering its result. It can take longer than the interval to finish if that work does not cooperate with cancellation.

## Start a scoped child task

Start an update, wait for it to finish, then read the modified count. Save this separate program as child_work.cv:

```carven run
import std::async using yield_once;

async fn update(&count: i32) {
    await yield_once();
    count += 1;
}

async fn main() {
    var count = 0;
    async let child = update(&count);
    await child;
    println(count);
}
```

Run `carven child_work.cv`; it prints `1`. `async let` schedules the update and makes this scope responsible for its lifetime. Awaiting child observes its result and releases its active access to count. A child cannot be copied, transferred, or passed into cold composition.

## Request cancellation, then wait for closure

Stop a background counter after one iteration. Let the child observe the stop request, check its terminal state, and close it before taking its backing value. Save this complete program as cancel_work.cv:

```carven run
import std::async using { cancel_requested, cancel_point, yield_once, wait_ready, close };

async fn count(&completed: i32) {
    while !cancel_requested() {
        completed += 1;
        await yield_once();
    }

    println("cancellation observed");
    await cancel_point();
}

async fn main() {
    var completed = 0;
    async let worker = count(&completed);
    await yield_once();

    cancel worker;
    println("stop requested");

    let (_, cancelled) = await wait_ready(worker);
    println("cancelled", cancelled);
    await close(worker);

    let finished = &&completed;
    println("completed", finished);
}
```

Run `carven cancel_work.cv`. It prints:

```text
stop requested
cancellation observed
cancelled true
completed 1
```

The parent's `await yield_once()` lets the queued worker increment once and yield back. `cancel worker;` requests a stop and returns immediately, so stop requested prints before the worker observes it. `cancel_requested()` reads that request inside the child. `await cancel_point()` accepts it as cancelled completion.

`wait_ready(worker)` waits for a terminal child and returns its index and cancellation flag. The tuple binding discards the index and keeps cancelled. It observes readiness without consuming the child or releasing its backing. `await close(worker)` then discards the outcome and waits until the child and its provider no longer use that backing. The Take of completed is valid after closure.

You can also call `await close(child)` directly to request cancellation and wait in one step. Returning or leaving a failing scope closes its children before their backing is destroyed. Cancellation stays separate from a typed failure caught by naming a payload.

A child with Write access keeps its backing in place until await or close completes. Pure Read values are snapshots; borrowed `str`, slices, pointers, and callable views are not admitted as async inputs. Pass owning `String` data with Take when work must retain text.

## Check asynchronous algorithms during compilation

```carven
import std::async using { when_all, yield_once };

const async fn next(value: i32) -> i32 {
    await yield_once();
    return value + 1;
}

const test "joined results" {
    let (first, second) = await when_all(next(20), next(21));
    check(first == 21);
    check(second == 22);
}
```

Save this as async_tests.cv and run `carven check async_tests.cv`. This executes the static test, including its await. Ordinary runtime tests are synchronous and cannot await. The [async reference](/reference/async/) describes static and interpreted execution.

Continue with the [JSON input project](/learn/data-pipeline/) after the inventory exercise to combine these operations with real input.

## Exercise

Add a fourth subtotal to the joined program and update the recursive target. In cancel_work.cv, move `let finished = &&completed;` before close and inspect the borrow-conflict diagnostic. In select_result.cv, make the first candidate available and compare the two selection results. Add a static test for `when_all()` returning `()` and one input returning a singleton tuple.
