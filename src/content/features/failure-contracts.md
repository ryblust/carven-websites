---
title: "Handle failures where you can recover"
description: "Reject malformed records, keep error details, and check what each function leaves to its caller."
section: failure-contracts
source: docs/language/failures.md
---

## Reject one record and keep processing

A log processor needs to distinguish a missing field from an invalid number, but one bad record should not discard the valid records that follow it. Put parsing in a function that describes its possible failures, then recover in the loop that processes each record.

Here `RecordError` keeps the application-level cases. `InvalidLatency` also carries the original numeric parse error. `throw RecordError` in the function signature tells callers what can fail; each `?` marks where a failure leaves the current expression.

```carven run
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

The [failure reference](/reference/failures/) defines when to declare a failure set and when it can be inferred.

A handler can recover the failures its layer understands and leave the rest to its caller. See [partial catches and residual sets](/reference/failures/#partial-catches-and-residual-sets) for coverage, guarded patterns, and `rethrow`.

Async functions use the same failure contract: `await operation()?` awaits completion and propagates a failure. The [batch workflow](/playground/#example=async-workflow) applies it to several operations. Composition, cancellation, and cleanup are covered in the [async reference](/reference/async/).

## Distinguish recovery from stopping execution

Use typed failures for conditions the caller can handle, and assertions for broken invariants. [Failures and termination](/reference/failures/) distinguishes recoverable failures from stopping execution; [C++ interop](/reference/interop/#noexcept) defines native exception handling.
