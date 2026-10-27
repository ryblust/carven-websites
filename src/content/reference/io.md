---
title: "Input, output, and framing"
description: "Bounded asynchronous input, structural output, UTF-8 errors, and incremental record framing."
section: reference
lesson: 29
source: docs/language/io.md
---

`std::io` covers two common tasks: write values to `stdout` or `stderr`, and read process input as bytes, complete text, or lines. Printing uses synchronous calls; reads return async operations that must be awaited. The framing helpers assemble records when input arrives in chunks.

## Capabilities and imports

Printing and `stdin` are available by default. Import other declarations when
naming them.

| Capability                                | API                                          |
| ----------------------------------------- | -------------------------------------------- |
| Standard output and error                 | `print`, `println`, `eprint`, `eprintln`     |
| Asynchronous standard input               | `stdin`, `Stdin`, `ReadResult<T>`, `IOError` |
| Line boundaries in a complete byte buffer | `ByteLines`, `LineBoundary`                  |
| Incremental bounded byte records          | `LineFramer`, `LineFrameError`               |

## Printing

See [printing](/reference/formatting/#printing) for the `print`, `println`, `eprint`, and `eprintln` contracts, and [structural display](/reference/formatting/#structural-display) for aggregate output.

```carven run
println("answer", 42); // answer 42
println(f"hex: {42:04x}"); // hex: 002a
eprintln("status", "ready"); // Written to stderr.
```

## Input and framing types

Import these source declarations from `std::io` when naming them. They have no default name bindings; the source function `stdin` is a default.

| Type             | Contract                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `ReadResult<T>`  | Payload enum: `Data(T)` or nullary `End`                                                                                               |
| `IOError`        | Payload enum: `System(i32)`, `InputTooLarge(usize)`, `InvalidUTF8(UTF8Error)`; import `UTF8Error` from `std::utf` when naming its type |
| `LineBoundary`   | Payload enum: `Line(usize, usize, bool)` or nullary `End`; start, exclusive end, LF-present flag                                       |
| `LineFrameError` | Payload enum: `TooLong(usize)`, `Truncated`, `Finished`; `TooLong` carries the configured limit                                        |
| `CarriageReturn` | Numeric enum: `Preserve` or `Strip`; controls CR before LF                                                                             |
| `IncompleteLine` | Numeric enum: `Return` or `Reject`; controls unfinished input at EOF                                                                   |
| `Stdin`          | Class containing input configuration; methods below                                                                                    |
| `ByteLines`      | Class containing a traversal offset; methods under [byte framing](#byte-framing)                                                       |
| `LineFramer`     | Class owning a pending byte record; methods under [byte framing](#byte-framing)                                                        |

## Standard input

`Stdin::new()` and `stdin()` construct equivalent configuration handles. Completed reads own their returned data.

| Operation                                    | Success                                                             | Nominal failure |
| -------------------------------------------- | ------------------------------------------------------------------- | --------------- |
| `Stdin::new() -> Stdin` / `stdin() -> Stdin` | Default input configuration                                         | None            |
| `input.read(max_bytes: usize)`               | `ReadResult<Vector<u8>>`: a chunk of at most `max_bytes`, or `.End` | `IOError`       |
| `input.read_all(limit: usize)`               | `Vector<u8>` through EOF, including empty input                     | `IOError`       |
| `input.read_text(limit: usize)`              | Owned, validated `String` through EOF                               | `IOError`       |
| `input.read_line()`                          | `ReadResult<String>`: an owned line, or `.End`                      | `IOError`       |
| `input.with_line_limit(limit: usize)`        | A new handle with the selected line content byte limit              | None            |

All methods use a Read receiver. `with_line_limit` copies the configuration and returns `Stdin`; it does not modify the original handle. The four read methods are synchronous factories returning `Operation<Success, throw IOError>`, where `Success` is the table's successful result. Factory construction has no typed failure; `IOError` is delivered when the operation executes.

Constructing or discarding an unstarted read does not consume input. Await or start a child to read the selected process input; [async lifetime and cancellation rules](/reference/async/) apply.

```carven
import std::io using IOError;

async fn main() throw IOError {
    let input = stdin().with_line_limit(4096);
    while {
        match await input.read_line()? {
            .Data(line) => println(line),
            .End => break,
        }
    }
}
```

Line reads strip LF and an immediately preceding CR. Empty lines are `.Data("")`,
distinct from EOF. A final line without LF is returned once before `.End`; a lone
CR remains content. Lines count bytes excluding the delimiter. The default line
limit is the representable byte range. `with_line_limit` selects a maximum line
length; `read_all(limit)` and `read_text(limit)` require an explicit maximum byte
count. A zero-sized chunk returns `.Data([])` without reading. Empty input read
through EOF returns empty owning data.

Byte reads preserve arbitrary bytes, including internal NUL and malformed UTF-8.
Text reads validate the completed byte sequence after consuming it, including when validation fails. [UTF8Error](/reference/utf/#error-and-streaming-contract) positions refer to the data returned by that read.

All reads use the `IOError` enum from `std::io`:

- `.System(i32)` carries the platform error code.
- `.InputTooLarge(usize)` carries the rejected maximum byte count.
- `.InvalidUTF8(UTF8Error)` carries the encoding error and byte positions.

Catch `IOError(error)` and match these cases to recover. Byte reads cannot fail
with `.InvalidUTF8`; chunk reads cannot fail with `.InputTooLarge`. Printing
retains its `void` contract and non-throwing failure behavior described above.

Handles within one runtime instance share an input cursor and buffer. Started requests are served
in FIFO registration order. Prefetched bytes remain available across read modes.
Cancellation removes its request and preserves buffered incomplete input. A limit
failure preserves input so the caller may retry with a larger limit or recover
with raw chunk reads. Buffering may prefetch one native block beyond the selected
limit before rejecting it.

### Input execution capabilities

Input factories and read operations have `const` execution capability. That
permits explicit static execution using the compiler process's input.
Interpreted and native reads use their executing process's input. Constructing
an input handle configures future reads without consuming input; ordinary calls
remain at runtime.

All input operations use the same successful values, typed failures, cancellation,
and cold-operation contracts in these stages. Prefetched bytes, EOF, and system
errors belong to a process cursor shared across static roots and subsequent
interpretation in that process.

A read's explicit limit produces `IOError::InputTooLarge`. Static and interpreted
value-size or aggregate-budget exhaustion is an execution limit and cannot be
caught as `IOError`. Input waits have no implicit elapsed-time limit.

## Byte framing

| Call                                                             | Access       | Result                   | Failure                                |
| ---------------------------------------------------------------- | ------------ | ------------------------ | -------------------------------------- |
| `ByteLines::new()`                                               | Associated   | `ByteLines`              | None                                   |
| `cursor.next(bytes: [u8])`                                       | Write cursor | `LineBoundary`           | None; invalid cursor offset terminates |
| `LineFramer::new(limit: usize, carriage_return: CarriageReturn)` | Associated   | `LineFramer`             | None                                   |
| `framer.feed(bytes: [u8])`                                       | Write framer | `Vector<Vector<u8>>`     | `LineFrameError`                       |
| `framer.finish(incomplete: IncompleteLine)`                      | Write framer | `ReadResult<Vector<u8>>` | `LineFrameError`                       |

All these functions and methods are `const fn`. `ByteLines` stores no input; its copies traverse independently from the copied offset. `LineFramer` copies own independent pending bytes and framing state.

Byte framing processes bytes without UTF-8 validation. Decode complete records
with `str::from_utf8` to preserve per-record recovery and multibyte characters
across chunks. The framing APIs accept byte slices from any source.

Create an offset cursor with `ByteLines::new()`, then call `cursor.next(bytes)`
to traverse a complete buffer. `LineBoundary::Line(start, end, terminated)` identifies bytes excluding LF;
`terminated` says whether LF was present. CR remains part of that boundary. `End`
marks exhaustion. Empty input and a final LF do not create phantom records. Keep
the same buffer for a traversal.

`LineFramer::new(limit, carriage_return: CarriageReturn)` owns an unfinished record.
`feed(bytes)?` returns owning byte vectors for every completed LF record, including
empty records. The limit counts bytes before LF, including a possible CR.
`CarriageReturn::Strip` removes CR immediately before LF from the delivered record;
`Preserve` retains it. Arbitrary block splits are allowed. A bare CR at EOF is content.

`finish(incomplete: IncompleteLine)?` seals the attempt and returns `ReadResult::End`
or one remaining `ReadResult::Data` record. `IncompleteLine::Return` delivers the
unfinished record; `Reject` reports `LineFrameError::Truncated`.
An oversized record reports `TooLong(limit)` and seals the attempt; already
returned records remain independent, while records from the failing feed call
are not delivered. Further feed or finish calls report `Finished`. A zero limit
accepts empty LF records. All framing methods also support static execution.

## Asynchronous protocol output

For synchronous protocol output, `write_stdout(text: str) -> void throw IOError` writes verbatim text and flushes before returning. This `const fn` reports system failures as `IOError::System(code)`. Import it from `std::io`; it has no default binding.

`write_stdout_async(&&bytes)` returns a cold operation that writes every byte to
`stdout` or throws `IOError::System(code)`. It retains the owned vector while
waiting for output readiness, so other tasks continue under pipe backpressure.
One write may be active at a time; concurrent writes fail with a system busy code.
Serialize frames with a writer task and a bounded channel.

Cancellation stops the remaining write; a prefix already written stays in the
stream. On POSIX, the provider temporarily enables nonblocking `stdout` and restores
its original flags on completion or cancellation. On Windows, synchronous standard
handles use a cancellable native write; the operation retains its buffer until the
write has finished or cancellation has completed. Do not mix it with buffered printing,
`write_stdout`, or external writes while active.
