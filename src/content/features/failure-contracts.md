---
title: "Handle failures where you can recover"
description: "Reject malformed records, keep error details, and check what each function leaves to its caller."
section: failure-contracts
source: docs/language/failures.md
---

## Reject one record and keep processing

A log processor needs to distinguish a missing field from an invalid number, but one bad record should not discard the valid records that follow it. Put parsing in a function that describes its possible failures, then recover in the loop that processes each record.

Here `RecordError` keeps the application-level cases. `InvalidLatency` also carries the original numeric parse error. `throw RecordError` in the function signature tells callers what can fail; each `?` marks where a failure leaves the current expression.

```carven
import std::core using NumberParseError;
import std::utf using { split_once, TextError };

enum RecordError {
    Shape,
    InvalidLatency(NumberParseError),
    TextProcessing(TextError)
}

struct Record { milliseconds: u64, message: String }

fn parse_record(text: str) -> Record throw RecordError {
    try {
        let fields = split_once(text, " ")?;
        if !fields.found { throw RecordError::Shape; }
        return {
            milliseconds: u64::parse(fields.before)?,
            message: fields.after as String,
        };
    } catch {
        NumberParseError(error) => throw RecordError::InvalidLatency(error),
        TextError(error) => throw RecordError::TextProcessing(error),
    }
}

for line in ["37 token=[redacted]", "nope malformed", "42 超时"] {
    try {
        let record = parse_record(line)?;
        println(f"{record.milliseconds}ms: {record.message}");
    } catch {
        RecordError(_) => println("rejected:", line),
    }
}
```

The program prints both valid records and reports the rejected line:

```text
37ms: token=[redacted]
rejected: nope malformed
42ms: 超时
```

When `u64::parse` fails, its catch arm wraps the error as `RecordError::InvalidLatency`. The outer loop handles `RecordError`, prints the rejected input, and moves to the next line. For a valid record, the message is copied into an owned `String`, so the result can be kept independently of its input.

[Run the parser](/playground/#example=log-analysis). The [complete log analyzer](https://github.com/ryblust/carven/tree/main/examples/log_analyzer) adds byte framing, UTF-8 validation, credential redaction, statistics, and JSON output. This smaller example receives already-valid text and focuses on parsing and per-record recovery.

## Keep separate failures or define an application error

A layer can preserve independent failure types with `throw A + B`, allowing callers to recover from either type directly. The parser above takes another useful approach: it maps library failures into cases of its own `RecordError`. Choose the interface that gives callers the information they need.

Private helpers, lambdas, and the implicit entry infer the failures produced by their calls. Functions visible to other modules, and an explicit `main`, declare what they may propagate. The compiler checks that the body stays within this allowed set. Callers follow the declaration, including alternatives that the current body does not produce.

## Recover from one failure and propagate the rest

The [configuration example](/playground/#example=typed-failures) returns a default port for `Missing`, while `Denied` and `BadPort` still reach the caller. The compiler derives that remaining set from the recovery. If the function declares only `Denied`, its body is rejected because `BadPort` can still escape.

A guarded arm or a pattern covering only some payloads may leave a failure type unhandled. Complete coverage removes it; `rethrow` forwards the original failure. These checks continue to apply when an implementation changes, so deleting a recovery arm can require updating its public contract.

## Use the same contract with async work

An `async fn` declares its successful result and possible failures. Calling it creates work that has not started; `await operation()?` awaits completion and then propagates a failure. `when_all` combines the input failure sets. `first_successful` can keep waiting after a candidate fails. [Run the batch workflow](/playground/#example=async-workflow).

Cancellation is a separate completion. It requests that work stop, and child closure waits for the work and cleanup before releasing borrowed data. A timeout can therefore select `Timeout` while cleanup still takes time. The [async tutorial](/learn/async/) explains this lifecycle.

## Distinguish recovery from stopping execution

Use typed failures for conditions the caller can handle. `assert` reports a broken invariant and stops execution; `check` reports a failed test assertion. Executor limits and invalid runtime operations do not become failures that `catch` can recover.

C++ exceptions require a native adapter if recovery is needed: the adapter catches the exception and returns an explicit result or Carven failure. An exception escaping a generated `noexcept` boundary terminates. See [interop](/learn/interop/) for this boundary and [the failure reference](/reference/failures/) for propagation and coverage.

Generated C++ uses result carriers and branches to implement these choices. C++23 `std::expected`, `std::variant`, and library combinators can provide the corresponding result and control flow; Carven checks failure composition and coverage as part of the language.
