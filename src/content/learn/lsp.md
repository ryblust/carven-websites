---
title: "Advanced project: build the Carven language server"
description: Apply JSON document changes, run analysis asynchronously, return diagnostics, and close the session in carven-lsp.
section: learn
lesson: 20
source: tools/lsp/README.md
---

## Prepare the project and the task

Build a tool for Carven using Carven. Your task is to accept a document change from an editor, analyze the changed text while continuing to receive messages, and send diagnostics back. After the user fixes the code, send an empty diagnostics array to clear the error. Finish by delivering queued replies and closing the session's tasks.

The `carven-lsp` application implements this flow in Carven. A separate `carven-analyzer` process supplies compiler analysis. Use JSON to read and construct messages, Async to coordinate input and analysis, and owned values to carry text between those steps.

Complete [async workflows](/learn/async/) and the [JSON input project](/learn/data-pipeline/) first. Work in the Carven repository on a POSIX host with the compiler prerequisites from [your first program](/learn/first-program/). Install Node.js 24.12 or newer and pnpm for the protocol tests.

From the repository root, prepare the application and run its checks:

```sh
pnpm install --frozen-lockfile
./xmakew build
./xmakew build carven-lsp
./xmakew test carven-lsp/protocol
./xmakew test carven-test-lsp-framing/framing
```

Start the server with `./xmakew run carven-lsp`. Configure an editor to launch the built executable; pass `--analyzer /absolute/path/to/carven-analyzer`, or put the analyzer on PATH. The xmake run command supplies that PATH entry. The server exchanges framed messages on standard input and output.

Start with a small runnable edit below. For the remaining stages, open `tools/lsp/main.cv` in the existing application: main connects the children and analyze processes jobs. Its message loop carries the edit through analysis and diagnostic publication. Each stage has an observable result to check.

## Apply a JSON edit to a document

First, turn an editor message into new document text. Keep the URI, text, and editor version in a struct. Use `&document` to change that state, and keep the new text local until all changes have succeeded.

Save this complete program as `document_edit.cv` in the repository root. It uses the project's `apply_change` function, which handles both whole-text replacements and UTF-16 ranged edits:

```carven
import tools.lsp.protocol using { apply_change, ProtocolError };
import std::json using { Value, JSONError, ValueError };

struct Document {
    uri: String,
    text: String,
    version: i64,
}

fn apply_notification(&document: Document, message: Value) throw ValueError + ProtocolError {
    let params = message.get("params")?;
    let target = params.get("textDocument")?;
    let uri = target.get("uri")?;
    if uri.as_str()? != document.uri { throw ProtocolError::InvalidParams; }

    let version = target.get("version")?;
    let next_version = version.as_i64()?;
    if next_version <= document.version { return; }

    let changes = params.get("contentChanges")?;
    if changes.length()? == 0 { return; }
    var text = document.text;
    for index in 0..changes.length()? {
        text = apply_change(text.as_str(), changes.at(index)?)?;
    }

    document.text = &&text;
    document.version = next_version;
}

var document = Document {
    uri: "untitled:demo.cv",
    text: "fn main() {}",
    version: 1,
};

let inputs = [
    "{",
    r#"""
    {
        "jsonrpc": "2.0",
        "method": "textDocument/didChange",
        "params": {
            "textDocument": { "uri": "untitled:demo.cv", "version": 2 },
            "contentChanges": [
                { "text": "fn main() { let value: i32 = true; println(value); }" }
            ]
        }
    }
    """#,
];

for text in inputs {
    try {
        let message = Value::parse(text)?;
        apply_notification(&document, message)?;
        println(document.version, document.text);
    } catch {
        JSONError(_) => println("Invalid JSON"),
        ValueError(_) => println("Invalid fields"),
        ProtocolError(_) => println("Invalid edit"),
    }
}
```

Run it with the protocol module:

```sh
./xmakew run carven interpret document_edit.cv tools/lsp/protocol.cv
```

Standard output is:

```text
Invalid JSON
2 fn main() { let value: i32 = true; println(value); }
```

The malformed message is rejected, and the next message updates the document. The program has prepared source text containing a type error; analysis comes next.

`Value::parse` reports JSONError for invalid JSON. get, at, and as_i64 report ValueError for a missing field or incompatible value; apply_change can report ProtocolError for an invalid edit. The local try handles each failure and continues with the next message. Bind a returned child before borrowing its text with as_str(). The `r#"""` and `"""#` delimiters keep the multiline JSON's quotes unchanged.

Each change applies to the text produced by the preceding change. Only after that loop succeeds does `&&text` transfer the new text into the document. The struct owns the retained String. An old version returns before modifying it.

Check this step yourself: change true to 42 and run again. Then set version to 1 and verify that the original document remains at version 1. Finally, make the version a JSON string and check that the program reports Invalid fields.

In the application, `textDocument/didOpen` creates the stored document and `didChange` performs this update. The handler also validates the message envelope. Invalid parameters in a request with an id receive an error reply; invalid document-change notifications skip the update. Use the edit's resulting text and version for the analysis job.

## Keep receiving messages while analysis runs

A language server must receive the next edit while an earlier analysis is waiting for its reply. Give input, dispatch, analysis, and output their own child operations. Connect them with bounded channels.

Inside the application's `main`, after starting the analyzer and completing its greeting, start these children:

```carven
let events = ByteChannel::new(16);
let jobs = ByteChannel::new(1);
let output = ByteChannel::new(16);

async let writer = write_output(output);
async let reader = read_input(events);
async let worker = analyze(analyzer, jobs, events);
async let dispatch = session(events, jobs, output);

let (index, _) = await wait_ready(reader, worker, dispatch, writer);

if index == 0 {
    await reader?;
    await dispatch?;
} else if index == 1 {
    await worker?;
    throw ProtocolError::Analyzer;
} else if index == 2 {
    await dispatch?;
    cancel reader;
} else {
    await writer?;
    throw ProtocolError::Analyzer;
}
```

Import ByteChannel from `std::channel`, and wait_ready and close from `std::async`. Each `async let` starts a child without waiting for it here. While one child awaits input or analysis, another ready child can progress. The four children divide the work as follows:

| Child    | Task                                                     | Channel use                           |
| -------- | -------------------------------------------------------- | ------------------------------------- |
| reader   | Read editor bytes and report end of input.               | Send input to events.                 |
| dispatch | Apply edits, select analysis jobs, and assemble replies. | Receive events; send jobs and output. |
| worker   | Await analyzer replies.                                  | Receive jobs; send results to events. |
| writer   | Write complete protocol frames.                          | Receive output.                       |

`wait_ready` returns `(usize, bool)`: a terminal child's zero-based input position and its cancellation flag. The tuple binding keeps index and discards the flag with `_`. The dispatch-first branch awaits that child, then `cancel reader;` requests cancellation of the pending input operation. Await preserves the child's declared failures; an unexpected successful worker or writer return reports an analyzer failure.

Keep mutable document state in dispatch. Send owned messages through channels so each consumer can retain its data. A channel's capacity counts messages; an awaited send waits when capacity is exhausted. Analysis and input can therefore progress independently.

Recover message boundaries before parsing JSON. Feed input chunks into the Decoder from `protocol.cv`: it retains partial frames and yields complete String bodies. Content-Length counts UTF-8 bytes. A read may stop inside a character or contain several messages. At end of input, `decoder.finish()` checks for a truncated frame. The framing test above splits consecutive Unicode messages at every byte boundary.

## Send the updated document for analysis

For each accepted edit, assemble an update object with `Value::object()` and `set`: include its URI, module identity, editor version, and reconstructed text. The application queues this object and sends it to jobs when the analyzer is idle.

Use an async receive loop to process those jobs. Updates call request; project reloads call workspace. The existing packet helper prefixes the bytes with an event tag: 1 marks an analysis result so dispatch can distinguish it from input. The worker is:

```carven
async fn analyze(
    analyzer: Analyzer,
    jobs: ByteChannel,
    events: ByteChannel
) throw ProcessError + ValueError + JSONError + UTF8Error + ProtocolError {
    while {
        match await jobs.receive() {
            .End => return,
            .Data(bytes) => {
                let message = Value::parse_bytes(bytes)?;
                let method = message.get("method")?;

                let result = if method.as_str()? == "workspace" {
                    await workspace(analyzer, &&message)?
                } else {
                    await request(analyzer, &&message)?
                };

                let body = result.to_json()?;
                if !await events.send(&&packet(1, body.bytes)) { return; }
            },
        }
    }
}
```

The worker handles each `.Data(bytes)` job and returns on `.End` after the channel closes. The method field selects a document request or workspace reload.

`await request(analyzer, &&message)?` transfers the request to the analyzer operation, waits for completion, and propagates a declared failure. The analyzer runs as a child process through `std::process`. While this worker awaits its reply, the reader can receive a newer edit and dispatch can update its document store.

Serialize the result with `to_json()`, then send an owned packet back to events. The packet can outlive the local body String. `session` receives that result and passes it to `complete` to release the active job and prepare notifications.

Check this step with the gated analyzer scenario in `tools/lsp/tests/protocol.ts`. It holds an analyzer reply while more editor messages arrive. Verify that the server accepts those messages and eventually publishes the newest document version. Run `./xmakew test carven-lsp/protocol` after changing the scheduling code.

## Return diagnostics for the current text

Convert the analysis result into a `textDocument/publishDiagnostics` notification. In the publish loop in `tools/lsp/server.cv`, document is the current document and items contains its collected diagnostics. Put those items into a JSON object:

```carven
var params = Value::object();
params.set("uri", &&Value::string(document.uri.as_str()))?;
if find(self, document.uri.as_str()) != self.documents.length() {
    params.set("version", &&Value::integer(document.version))?;
}
params.set("diagnostics", &&items)?;

var notification = Value::object();
notification.set("jsonrpc", &&Value::string("2.0"))?;
notification.set("method", &&Value::string("textDocument/publishDiagnostics"))?;
notification.set("params", &&params)?;

self.outbox.send(notification)?;
```

`&&items` transfers the diagnostic array into params, then `&&params` transfers that object into the notification. Outbox retains the completed message as an output frame.

Keep results associated with the text they analyzed. The editor version identifies one open document's text. The server also increments a workspace generation after accepted changes; publish an analysis result only when its job's generation still matches. A later edit can affect diagnostics in dependent files too. The analyzer's own revision is carried separately between analysis requests.

Build each diagnostic range from the corresponding analyzed source. The analyzer returns UTF-8 byte offsets; LSP positions here use UTF-16 code units. For `中😀x`, x begins at byte offset 7 and UTF-16 position 3. The `range` helper converts both ends. Unopened project files participate in analysis and their notifications omit the editor version.

When the new text has no diagnostics, send an empty array. Also clear previously published diagnostics for documents removed from the project. The editor then removes its old error markers.

In `tools/lsp/protocol.cv`, frame the outgoing JSON with `Outbox::send`:

```carven
fn send(&self, message: Value) throw ValueError {
    let body = message.to_json()?;
    let framed = f"Content-Length: {body.byte_length()}\r\n\r\n{body}";
    self.messages.push(&&Vector<u8>::from_slice(framed.bytes));
}
```

Use `byte_length()` for the header's content length. Transfer the byte vector through output to the single writer, which calls `write_stdout_async`. Reserve standard output for protocol frames and use standard error for debugging.

Check the result with the protocol test's edit sequence: valid text produces an empty array; assigning true to i32 produces a type diagnostic; replacing it with 42 and increasing the version clears that diagnostic. Check the URI and version as well as the array contents. Sending an older edit must preserve the current document.

## Deliver queued replies and close the tasks

Handle shutdown as part of the message flow. The LSP shutdown request stops new jobs and replies with null. The following exit notification ends dispatch. End of input after shutdown can also finish the session once the decoder confirms a complete final frame.

Then close the children in data-flow order:

```carven
await close(reader);

events.close();
jobs.close();
output.close();

await writer?;

// Drain the active analyzer transaction before its shutdown handshake.
await worker?;

await stop_analyzer(analyzer)?;
```

`cancel reader;` requests cancellation. `await close(reader)` waits until that child no longer uses its retained data. Closing a channel lets consumers drain accepted messages and then observe End. Await writer to deliver queued replies, then await worker to finish the active analyzer exchange.

Finally, `stop_analyzer` sends the analyzer's shutdown request, reads its reply, closes the process input, and awaits its exit status. Each named child belongs to the surrounding lexical scope, which also closes children before releasing their backing on failure.

An editor's request cancellation is separate from ending a child task. For `$/cancelRequest`, remove a queued query or mark the active query cancelled. The active analyzer exchange still reads its reply before the next exchange begins; discard the cancelled query's result. This keeps subsequent replies paired with their requests.

Check shutdown in `tools/lsp/tests/protocol.ts`: the client sends shutdown, receives the null reply, sends exit, and waits for a successful process exit. The test also checks that no extra output remains.

## Extend the task

1. Change the runnable edit program to apply two changes in one notification. Make the second one invalid. Add `println(document.version, document.text);` after the input loop and verify that neither the stored text nor its version changes.
2. Add a UTF-16 ranged edit around an emoji. Check the resulting text, then check a diagnostic's reported range in the protocol test.
3. Extend the gated analyzer test with another edit while a reply is held. Verify that only diagnostics for the current text are published and that shutdown still finishes.

Run all language-server groups with `./xmakew test -g lsp`. The implementation is in [tools/lsp](https://github.com/ryblust/carven/tree/main/tools/lsp); the task spans `server.cv`, `protocol.cv`, and the async loop in `main.cv`. For individual contracts, use [JSON values](/reference/json/), [async operations](/reference/async/), and [input and output](/reference/io/).
