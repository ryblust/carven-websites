---
title: "Run a log analyzer, mixer, or C++ collector"
description: "Try three complete applications and follow the source and tests behind their behavior."
section: use-cases
source: examples/README.md
---

Start with a task you can run: turn logs into a report, mix sample data, or call a Carven module from C++. These applications show how ownership, typed failures, compile-time work, and async fit together.

Run the commands below from the Carven compiler repository root. The first command block builds the compiler and all three applications. Each application directory includes sample input, source, and tests.

## Analyze a stream of logs

The [log analyzer](https://github.com/ryblust/carven/tree/main/examples/log_analyzer) parses records with levels, numeric latency, and Unicode messages. It rejects malformed records independently, redacts credentials before retaining messages, gathers slow events into `Vector<String>`, and produces a JSON report.

The implementation separates parsing and reporting in `analysis.cv` from command-line arguments and asynchronous standard input in `main.cv`. It parses its owned JSON report template at compile time. Static tests verify redaction and configuration; runtime tests cover malformed fields, invalid UTF-8, CRLF, final lines without delimiters, and preserved record order.

```sh
./xmakew build
./xmakew build examples
./xmakew run carven-example-log-analyzer
```

Run [record parsing](/playground/#example=log-analysis) and [JSON template updates](/playground/#example=json-config) in your browser to explore the underlying contracts. The complete application can also read up to its explicit input limit with `--stdin`.

## Mix audio with floating SIMD

The [audio mixer](https://github.com/ryblust/carven/tree/main/examples/audio_mixer) mixes two embedded tracks with configurable gains. Its `const fn` processes eight floating samples per block, rejects nonfinite results, and clips the mixed signal to −1 through 1. The report includes the number of clipped samples, peak amplitude, and root mean square (RMS) level. An active-lane mask marks which positions in the final block contain input, so padding does not affect the result.

```sh
./xmakew run carven-example-audio-mixer --voice=1.0 --music=0.5
./xmakew run -q carven-example-audio-mixer --logs > mixer.log
./xmakew run -q carven-example-log-analyzer --stdin < mixer.log
```

The last two commands connect the mixer to the analyzer using their shared log format. The samples are embedded in the source; running the application prints calculated results rather than playing audio. [Run its core mixing algorithm](/playground/#example=audio-mixer), including a static test of the final sample.

SIMD selects NEON, explicitly enabled AVX2, or portable implementation during native compilation, with no runtime dispatch. Keep backend flags consistent across translation units and measure the actual workload.

## Let C++ host a Carven module

The [stream collector](https://github.com/ryblust/carven/tree/main/examples/stream_collector) keeps the application entry and stream provider in C++. C++ calls an `export(cpp)` Carven function, which reads two host-owned memory streams, deduplicates records, and returns an owned report with counts.

```sh
./xmakew run carven-example-stream-collector
```

This demonstrates both directions of the native boundary: `import(cpp)` for provider work and `export(cpp)` for the checked workflow. C++ includes the generated API header and links generated implementations through the Xmake rule. The provider reuses its line buffer on the next read, so the collector copies retained records into String. The host keeps its streams alive for the call, and the returned report owns its records. See [C++ generation](/features/cpp-generation/#connect-to-an-existing-c-project).

## Compose asynchronous application work

If several tasks can make progress independently, `when_all` starts them together and returns their results as a tuple in input order. Each result can own strings and vectors. `first_successful` accepts alternative operations and selects a successful result, continuing after another candidate fails.

A child started with `async let` belongs to its surrounding scope. Cancellation and closure let that scope stop the work and wait for cleanup before releasing the data it borrowed. The [scope example](/playground/#example=async-scope) also checks this flow during compilation.

[Run the in-memory batch workflow](/playground/#example=async-workflow). For native I/O, combine bounded `stdin` reads, line framing, checked time intervals, and timeout composition. `std::net` adds read and write operations over connections adopted by a C++ host. It does not establish connections, listen, resolve names, or provide TLS.

## Evaluate against your actual boundary

Use the same revision of compiler, Crafts, examples, and documentation. Build the compiler with `./xmakew build`; use `carven check` for analysis and static tests, then execute and test the complete native application. Native C++ names, overloads, templates, and provider implementations still require native compilation.

The Playground runs these supported source operations through an interpreter. External C++ calls and TCP operations need a native host. Source tasks run on one thread; a C++ host that shares data across threads remains responsible for synchronization and external resource lifetimes.
