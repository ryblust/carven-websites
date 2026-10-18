---
title: "Example applications"
description: "Try three complete applications and follow the source and tests behind their behavior."
section: use-cases
source: examples/README.md
---

Start with a task you can run: turn logs into a report, mix sample data, or call a Carven module from C++. These applications show how ownership, typed failures, compile-time work, and async fit together.

Make `carven` and a C++20 toolchain available in your terminal. Create a working directory and copy the linked `log_analyzer` and `audio_mixer` source directories into it. Run the commands below from that directory; each command names all application source files.

## Analyze a stream of logs

The [log analyzer](https://github.com/ryblust/carven/tree/main/examples/log_analyzer) parses records with levels, numeric latency, and Unicode messages. It rejects malformed records independently, redacts credentials before retaining messages, gathers slow events into `Vector<String>`, and produces a JSON report.

The implementation separates parsing and reporting in `analysis.cv` from command-line arguments and asynchronous standard input in `main.cv`. It parses its owned JSON report template at compile time. Its tests cover parsing, redaction, and reporting.

```sh
carven log_analyzer/main.cv log_analyzer/analysis.cv
```

Run [record parsing](/playground/#example=log-analysis) and [JSON template updates](/playground/#example=json-config) in your browser to explore the underlying contracts. The complete application can also read up to its explicit input limit with `--stdin`.

## Mix audio with floating SIMD

The [audio mixer](https://github.com/ryblust/carven/tree/main/examples/audio_mixer) mixes two embedded tracks with configurable gains. Its `const fn` processes eight floating samples per block, rejects nonfinite results, and clips the mixed signal to −1 through 1. The report includes the number of clipped samples, peak amplitude, and root mean square (RMS) level. An active-lane mask marks which positions in the final block contain input, so padding does not affect the result.

```sh
carven audio_mixer/main.cv audio_mixer/mix.cv -- --voice=1.0 --music=0.5
carven audio_mixer/main.cv audio_mixer/mix.cv -- --logs > mixer.log
carven log_analyzer/main.cv log_analyzer/analysis.cv -- --stdin < mixer.log
```

The last two commands connect the mixer to the analyzer using their shared log format. The samples are embedded in the source; running the application prints calculated results rather than playing audio. [Run its core mixing algorithm](/playground/#example=audio-mixer), including a static test of the final sample.

## Let C++ host a Carven module

The [stream collector](https://github.com/ryblust/carven/tree/main/examples/stream_collector) keeps the application entry and stream provider in C++. C++ calls an `export(cpp)` Carven function, which reads two host-owned memory streams, deduplicates records, and returns an owned report with counts.

This example has a C++ entry point and provider. Follow its [native build instructions](https://github.com/ryblust/carven/tree/main/examples/stream_collector) to build and run the host application.

C++ includes the generated API header and links the generated implementation through the Xmake rule. [C++ generation](/features/cpp-generation/#connect-to-an-existing-c-project) follows this application's interface, storage, and cleanup.

## Compose asynchronous application work

[Run the batch workflow](/playground/#example=async-workflow) to process independent records together and select between candidate results. The [scope example](/playground/#example=async-scope) demonstrates cancellation and cleanup, with a static test of the same flow. Continue with the [async tutorial](/learn/async/) to build these workflows, or use the [standard API index](/reference/library/) to find input, time, and network APIs.
