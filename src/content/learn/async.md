---
title: "Start asynchronous work and combine its results"
description: "Choose when work starts, combine results, set deadlines, and finish children before leaving their scope."
section: learn
lesson: 14
source: docs/language/async.md
---

## Construct work, then execute it

When work may have to wait for input or time, an async function lets other scheduled work make progress. First distinguish describing that work from actually starting it. Save this as async_work.cv:

```carven
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

## Join independent results

Replace the previous file with this complete batch program:

```carven
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

It prints `2400 1400`. `when_all` starts all its inputs and returns results in input order. Nested joins keep their nesting. record_audit contributes `()`, so the target uses `_` for that position. The alias join selects the same builtin and completion rules as when_all.

A stored operation passed into composition uses Take, for example `join(&&pending, other())`. A cold operation can only run once, so it cannot be copied or captured by a closure. Import `Operation` from `std::async` when you need to spell a type such as `Operation<i32>` or `Operation<i32, throw LoadError>`. Constructing a composite still does not start any input.

`when_any` takes the first completed outcome, whether success or failure; `first_successful` keeps looking for success after a candidate fails. Both produce `(usize, T)` with the input position and common successful type. They close all their inputs before returning. The result may report any input's declared failure; cancellation is a separate outcome.

## Bound a request with a deadline

Save this separate program as deadline.cv:

```carven
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

It deterministically prints `-1`: a nonpositive timeout chooses Timeout without starting load. Try `100ms` to allow it to finish; scheduling and host load can still affect which completion wins. Duration literals (`ns`, `us`, `ms`, `s`) construct checked `Duration` values. Naming the type requires its import; using a literal does not.

`sleep` and timeout may fail with RangeError if deadline arithmetic is unrepresentable. The try handles Timeout and the explicit main contract preserves RangeError. `await operation()?` awaits completion first, then propagates a nominal failure. Cancellation is a separate completion, so it is not caught by naming a failure payload.

A timeout closes its protected work before delivering its result. It can take longer than the interval to finish if that work does not cooperate with cancellation. It is a completion deadline with structured cleanup, not a mechanism to forcibly terminate code.

## Start a child whose lifetime belongs to this scope

```carven
import std::async using { close, yield_once };

async fn update(&count: i32) {
    await yield_once();
    count += 1;
}

async fn main() {
    var count = 0;
    async let child = update(&count);
    await child;
    println(count);

    async let unused = update(&count);
    await close(unused);
    println("closed");
}
```

This prints `1` followed by `closed`. The program does not depend on whether unused executes its update before closure: close discards that outcome. `async let` schedules work and makes its lexical scope responsible for the child. Before leaving normally, await the child, close it, or request `cancel child;`. A child cannot be copied, transferred, or passed into cold composition.

`cancel child;` requests cancellation and returns immediately; it does not finish cleanup or release retained backing. `await close(child)` requests cancellation and waits until the child and its provider have stopped using the retained data. It discards the result; after it returns, the data is no longer held by that child. Returning or leaving a failing scope also closes its children before their backing is destroyed.

If a child has Write access to a variable, keep that variable in place until await or close completes. Taking it away or replacing its storage earlier would leave the child using invalid data, so the compiler rejects those operations. Pure Read values are snapshots; borrowed `str`, slices, pointers, and callable views are not admitted as async inputs. Pass owning `String` data with Take when work must retain text.

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

`carven check async_tests.cv` executes this static test. Ordinary runtime tests may use synchronous helpers; there is no `async test` form. Supported static and interpreted async operations use the same cold, scheduling, ownership, and closure rules. Native C++ provider bodies still require native execution.

Continue with the [JSON input project](/learn/data-pipeline/) after the inventory project to combine these operations with real input. Networking in `std::net` uses host-supplied TCP connections: a native host must create and retain sockets and drive the event source. Source APIs do not create listeners, resolve names, or provide TLS; see the [standard-library reference](/reference/library/).

## Exercise

Add a fourth subtotal to the joined program and update the recursive target. Replace `await child` with `cancel child;` and explain why the updated count is no longer the result to depend on. Add a static test for `when_all()` returning `()` and one input returning a singleton tuple.
