---
title: Learn Carven
description: Start with a working program and build an order project with validation, failure recovery, and tests.
section: learn
lesson: 0
source: docs/language/tutorial.md
---

## Start here

You only need to be comfortable using a terminal and editing text files. The first chapters require no prior C++ knowledge. The first chapter prepares the compiler, runs a program, and inspects its generated C++. You can also open the Playground to try the site's examples directly.

## Learning route

Each stage starts with a practical problem, then introduces the language tools to solve it. Follow this route to build an order program that leaves stock unchanged when an operation fails.

<ol class="learning-route">
<li><strong>Write the basic logic</strong><p>Calculate prices, represent stock, and organize a small program.</p><p><a href="/learn/values/">Values</a> · <a href="/learn/control/">Control flow</a> · <a href="/learn/functions/">Functions</a> · <a href="/learn/aggregates/">Data structures</a></p></li>
<li><strong>Manage data and interfaces</strong><p>Distinguish reading, updating, transferring, and borrowing; combine modules, failure contracts, and callbacks.</p><p><a href="/learn/ownership/">Access and ownership</a> · <a href="/learn/text/">Text</a> · <a href="/learn/formatting/">Formatting</a> · <a href="/learn/modules/">Modules</a> · <a href="/learn/failures/">Failure contracts</a> · <a href="/learn/closures/">Closures</a></p></li>
<li><strong>Test and compute ahead</strong><p>Verify behavior with tests and construct static data before runtime.</p><p><a href="/learn/testing/">Testing</a> · <a href="/learn/constants/">Compile-time computation</a></p></li>
<li><strong>Finish the order project</strong><p>Combine input validation, stock updates, failure recovery, and tests into a complete program.</p><p><a href="/learn/project/">Project: inventory</a></p></li>
</ol>

## Extensions and further reading

When you need native libraries, continue with [C++ integration](/learn/interop/) and [pointers](/learn/pointers/). These chapters introduce headers, dependencies, and external storage requirements. If you are concentrating on Carven code, move from compile-time computation directly to the order project.

For commands, formatting, and error investigation, read [running, formatting, and diagnostics](/learn/workflow/). To check the rules for a particular form, use the [language reference](/reference/). To understand the language's choices, explore [design and principles](/design/).
