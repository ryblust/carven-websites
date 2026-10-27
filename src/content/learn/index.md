---
title: Learn Carven
description: Learn the language, build and test native projects with Carven code, then apply those skills in the language server.
section: learn
lesson: 0
source: docs/language/tutorial.md
---

## Start here

You only need to be comfortable using a terminal and editing text files. The first chapters require no prior C++ knowledge. The first chapter prepares the compiler, runs a program, and inspects its generated C++. Use the Playground for self-contained examples supported by its browser environment. Native interop and host networking use the local toolchain; input examples below include explicit terminal instructions.

## Learning route

Each stage starts with a practical problem, then introduces the language tools to solve it. Follow the route from basic calculations through an inventory exercise and an asynchronous JSON ledger. Then use Carven itself to build and test a native project before exploring the language server. Each step builds on the previous one: represent the data, make changes safely, handle rejected input, and verify the result.

<ol class="learning-route">
<li><strong>First programs</strong><p>Run a program, calculate prices, control execution, and group related data.</p><p><a href="/learn/first-program/">First program</a> · <a href="/learn/values/">Values and types</a> · <a href="/learn/control/">Branches and loops</a> · <a href="/learn/functions/">Functions</a> · <a href="/learn/aggregates/">Data structures</a></p></li>
<li><strong>Data and interfaces</strong><p>Read, update, transfer, and borrow data; print results, combine modules, handle failures, and pass callbacks.</p><p><a href="/learn/ownership/">Access and ownership</a> · <a href="/learn/text/">Text</a> · <a href="/learn/formatting/">Formatting</a> · <a href="/learn/modules/">Modules</a> · <a href="/learn/failures/">Failures and recovery</a> · <a href="/learn/closures/">Closures</a></p></li>
<li><strong>Tests, compile time, and async</strong><p>Verify behavior, prepare static data, and combine asynchronous work. Practice waiting for results and cancelling work before leaving its scope.</p><p><a href="/learn/testing/">Testing</a> · <a href="/learn/constants/">Compile-time computation</a> · <a href="/learn/async/">Async workflows</a></p></li>
<li><strong>Native integration</strong><p>Call C++ libraries and work with external addresses.</p><p><a href="/learn/interop/">C++ interop</a> · <a href="/learn/pointers/">Native addresses</a></p></li>
<li><strong>Practice and projects</strong><p>Practice with inventory and JSON input, then keep tests beside business code and write an ordinary Carven build script to build, run, test, and query the application. Finish with the language-server application.</p><p><a href="/learn/project/">Exercise: inventory</a> · <a href="/learn/data-pipeline/">Project: JSON input</a> · <a href="/learn/build/">Build a native project</a> · <a href="/learn/workflow/">Tools and workflow</a> · <a href="/learn/lsp/">Project: language server</a></p></li>
</ol>

## Build your own project

[Build and test with Carven](/learn/build/) guides you through three complete files: a business module with inline tests beside its function, an application entry, and `build.cv`. One ordinary application plan drives `carven build`, `carven run`, `carven test`, and `carven query`. Compose native options with functions, and let the editor read the same model.

## Run complete examples

Try [summarizing TOML configuration](/playground/#example=toml-summary), [calling a closure policy in both execution stages](/playground/#example=closure-policy), [transferring bytes through a bounded channel](/playground/#example=channel-pipeline), or [reading and writing a file report](/playground/#example=file-report). Change an input and execute each program again. The [async tests](/playground/#example=async-tests) use **Test** to run test bodies and their child tasks.

To extend your local build beyond the guided project, use the [build API reference](/reference/build/). The [imperative build example](https://github.com/ryblust/carven/tree/v0.1.0/examples/build/imperative) reads TOML, generates source, and assembles several native targets from its configuration.

## Look up a rule or a design choice

Use the [language reference](/reference/) to find syntax, APIs, and their rules. Explore [design and principles](/design/) to understand how the language and its implementation fit together.
