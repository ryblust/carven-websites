---
title: Learn Carven
description: Learn the language through a working order program, then process and validate real JSON input.
section: learn
lesson: 0
source: docs/language/tutorial.md
---

## Start here

You only need to be comfortable using a terminal and editing text files. The first chapters require no prior C++ knowledge. The first chapter prepares the compiler, runs a program, and inspects its generated C++. Use the Playground for self-contained examples supported by its browser environment. Native interop and host networking use the local toolchain; input examples below include explicit terminal instructions.

## Learning route

Each stage starts with a practical problem, then introduces the language tools to solve it. Follow the route from basic calculations to two complete projects: an inventory workflow and an asynchronous JSON ledger. Each step builds on the previous one: represent the data, make changes safely, handle rejected input, and verify the result.

<ol class="learning-route">
<li><strong>Write the basic logic</strong><p>Calculate prices, group related data, and keep a collection of accepted results.</p><p><a href="/learn/values/">Values</a> · <a href="/learn/control/">Control flow</a> · <a href="/learn/functions/">Functions</a> · <a href="/learn/aggregates/">Data structures</a></p></li>
<li><strong>Manage data and interfaces</strong><p>Distinguish reading, updating, transferring, and borrowing; combine modules, failure contracts, and callbacks.</p><p><a href="/learn/ownership/">Access and ownership</a> · <a href="/learn/text/">Text</a> · <a href="/learn/formatting/">Formatting</a> · <a href="/learn/modules/">Modules</a> · <a href="/learn/failures/">Failure contracts</a> · <a href="/learn/closures/">Closures</a></p></li>
<li><strong>Test and compute ahead</strong><p>Verify behavior with tests and construct static data before runtime.</p><p><a href="/learn/testing/">Testing</a> · <a href="/learn/constants/">Compile-time computation</a></p></li>
<li><strong>Compose asynchronous work</strong><p>Start work deliberately, wait for several results, and finish or cancel work before leaving its scope.</p><p><a href="/learn/async/">Async and time</a></p></li>
<li><strong>Finish the order project</strong><p>Combine input validation, stock updates, failure recovery, and tests into a complete program.</p><p><a href="/learn/project/">Project: inventory</a></p></li>
<li><strong>Process real input</strong><p>Read JSON lines with a size limit, skip rejected records, and emit a machine-readable summary.</p><p><a href="/learn/data-pipeline/">Project: JSON input pipeline</a></p></li>
</ol>

## Extensions and further reading

When you need native libraries, continue with [C++ integration](/learn/interop/) and [pointers](/learn/pointers/). These chapters introduce headers, dependencies, and external storage requirements. If you are concentrating on Carven code, continue from compile-time computation through async work and the two projects.

For commands, formatting, and error investigation, read [running, formatting, and diagnostics](/learn/workflow/). To check the rules for a particular form, use the [language reference](/reference/). To understand the language's choices, explore [design and principles](/design/).
