---
title: "Project: validate and summarize JSON input"
description: "Read JSON records, explain rejected data, and summarize accepted amounts without losing the rest of the input."
section: learn
lesson: 18
source: docs/language/json.md
---

## Define the input and output contract

Read one JSON object per line. Each object must have an integer `amount` from 0 through 1000000. Accept valid records. For an invalid record, report the reason to stderr. Then continue with the next record. At EOF, write one JSON summary to stdout.

Keep amount validation separate from reading: you can test a single record without providing a whole input stream. stdout carries the summary for another program to consume; stderr carries explanations for a person reading the run.

amount_of parses and checks one record. main reads lines and accumulates accepted amounts. summary creates the final JSON. The two tests exercise amount_of directly. Save the complete file as ledger.cv:

```carven
import std::io using IOError;
import std::json using { Value, JSONError, ValueError };

struct InvalidAmount {
    amount: i64,
}

const fn amount_of(text: str) -> i64 throw JSONError + ValueError + InvalidAmount {
    let record = Value::parse(text)?;
    let field = record.get("amount")?;
    let amount = field.as_i64()?;
    if amount < 0 || amount > 1000000 {
        throw InvalidAmount { amount };
    }
    return amount;
}

const fn summary(count: usize, total: i64) -> String throw ValueError {
    var result = Value::object();
    result.set("count", &&Value::unsigned_integer(count as u64))?;
    result.set("total", &&Value::integer(total))?;
    return result.to_json()?;
}

async fn main() throw IOError + ValueError {
    let input = stdin().with_line_limit(4096);
    var accepted: usize = 0;
    var total: i64 = 0;

    while {
        match await input.read_line()? {
            .End => break,
            .Data(line) => {
                try {
                    let amount = amount_of(line)?;
                    assert(total <= 9223372036854775807i64 - amount, "ledger total overflow");
                    total += amount;
                    accepted += 1;
                } catch {
                    JSONError(error) => eprintln("Invalid JSON at byte", error.offset),
                    ValueError(_) => eprintln("Expected an object with an integer amount"),
                    InvalidAmount(error) => eprintln("Amount outside policy:", error.amount),
                }
            },
        }
    }
    println(summary(accepted, total)?);
}

const test "valid amount" {
    let amount = try {
        amount_of(r#"{"amount":1250}"#)?
    } catch {
        _ => fail("valid record must succeed"),
    };
    check(amount == 1250);
}

const test "negative amount is a policy failure" {
    try {
        amount_of(r#"{"amount":-1}"#)?;
        fail("negative amount must fail");
    } catch {
        InvalidAmount(error) => check(error.amount == -1),
        _ => fail("expected InvalidAmount"),
    }
}
```

Create input.ndjson:

```json
{"amount":1250}
{"amount":-1}
{"amount":750}
```

Run native execution or the supported interpreter:

```sh
carven ledger.cv < input.ndjson
carven interpret ledger.cv < input.ndjson
```

stdout contains:

```json
{"count":2,"total":2000}
```

stderr additionally reports `Amount outside policy: -1`. Compiler status and diagnostic lines may also appear there. `carven check ledger.cv` runs the two static tests without consuming stdin or running main.

## Own values across each boundary

`read_line` returns a cold operation. Awaiting it yields `.Data(String)` or `.End`. An empty line is data and fails JSON parsing; it is not EOF. LF and an immediately preceding CR are removed; a final unterminated line is returned once. The 4096 limit counts content bytes rather than Unicode characters.

Each line owns its bytes. Value::parse builds an independent JSON tree; get returns an independent child value. amount_of returns a numeric value, so no borrowed view leaves the call. This avoids retaining input buffers across iterations.

summary creates a new JSON object and puts count and total into it. Its insertion order produces count before total. JSON writing creates an independent String. JSON numbers preserve their original spelling; `as_i64` deliberately rejects floating spelling or values outside i64, rather than silently rounding.

## Separate malformed data from unavailable input

The per-record try handles exactly the data failures. Missing keys, the wrong root kind, or a noninteger amount are ValueError; malformed syntax is JSONError; a representable integer outside the application policy is InvalidAmount.

IOError escapes main because an unavailable input source, invalid UTF-8, or an overlong line requires a stream-level decision. A line limit failure preserves buffered input: blindly retrying with the same limit would not make progress. Choose a larger limit, switch to raw chunk recovery, or stop. The program chooses to stop and lets the entry report its typed failure and return a failure status.

Integer arithmetic wraps, so the running-total assertion checks the remaining range before addition. It treats exhaustion of this example's ledger capacity as an invariant failure, with no automatic rollback or catch. A service that needs recoverable capacity rejection should declare a separate nominal failure and test that policy. The accepted-record counter likewise assumes the input fits usize.

## Turn validation into reusable preparation

The same amount_of function runs during compilation and at runtime. Static tests cover success and a policy failure; extend them to malformed JSON, a missing amount, fractional spelling, and the maximum accepted value. Handle every declared failure in tests.

Run ordinary tests with `carven --tests ledger.cv` after adding runtime test bodies. Tests skip the application entry. The entry remains a small sequence of read, validate, accumulate, and write; parsing and summary construction can be reused without stdin.

## Adapt the pipeline to other sources

For a single bounded document use `await stdin().read_text(limit)?`; for arbitrary byte chunks use `read(max_bytes)` or `read_all(limit)`. `std::io` provides ByteLines and LineFramer when record boundaries cross chunks. Frame bytes first and validate UTF-8 per complete record when invalid records should be recovered independently.

The same framing and parsing core can process TCP chunks from `std::net`. A native C++ host must provide the connection and event source, preserve their lifetimes, and drive the exported async root. Writes can be short; `write_all(view, &&bytes)` retains an owned buffer until completion. Networking here does not include connection establishment, DNS, or TLS. See [the standard-library reference](/reference/library/) before adapting this example.

## Exercise

Add a required `category` string and report independent totals for two known categories. Copy a borrowed JSON string into String before retaining it. Keep output exclusively on stdout and record rejection messages on stderr. Add a test showing that a rejected record never changes either total, then test EOF after a line with no final newline.
