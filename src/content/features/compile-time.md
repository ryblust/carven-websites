---
title: "Compile-time execution"
description: "Parse configuration, retain its result, and test the same algorithms at compile time and runtime."
section: compile-time
source: docs/language/constants.md
---

## Prepare a configuration template once

A program may start from the same configuration template on every run. Parse that fixed input during compilation, then make an independent copy when the running program needs to change it.

In this example, `const defaults` asks the compiler to parse the JSON now. `configure` is an ordinary function: it copies the template and applies runtime settings. `const test` checks that the parsed template starts with the expected worker count.

```carven run
import std::json using { JSONValue, JSONValueError }

const defaults = JSONValue::parse(r#"{"workers":2,"tags":["stable"]}"#)?;

fn configure(workers: i64) -> String throw JSONValueError {
    var config = defaults;
    config.set("workers", &&JSONValue::integer(workers))?;
    var tags = config.get("tags")?;
    tags.push(&&JSONValue::string("observed"))?;
    config.set("tags", &&tags)?;
    return config.to_json()?;
}

const test "the template starts with two workers" {
    check(try {
        defaults.get("workers")?.as_i64()? == 2
    } catch { JSONValueError(_) => false });
}

println(configure(8)?);
let original = defaults;
println(original.to_json()?);
```

The runtime output shows the changed copy followed by an unchanged copy of the template:

```text
{"workers":8,"tags":["stable","observed"]}
{"workers":2,"tags":["stable"]}
```

`JSONValue` owns its strings and collections, so the two trees can be changed independently. `get("tags")` also returns an independent child value; after appending a tag, `set` puts that changed child back into the configuration. `&&` transfers the child into the receiving container.

[Run the configuration example](/playground/#example=json-config), change the worker count or add a tag, and compare the two output lines. The JSON library's parsing, mutation, and writing functions are `const fn`, so the same operations can run in either stage.

## Retain typed results and copy them at runtime

The parsed template retains its `JSONValue` type and complete contents. `var config = defaults` makes an independent copy that the running program can modify. The same approach works for lookup tables built with loops and mutable locals. See [constant results and storage](/reference/constants/#constant-results-and-storage) for other result types and borrowed views.

## Choose the execution stage

`const fn` allows a function to run at compile time; the call site selects the stage. In this example, `const defaults` requests compile-time parsing, while the ordinary calls to `configure` run when the program executes. See [compile-time computation](/reference/constants/) for constant blocks, static tests, supported operations, and execution budgets.

## Specialize runtime work with known inputs

Sometimes only the configuration is known ahead of time. A [static parameter](/reference/functions/#static-parameters) fixes that input while other parameters carry runtime data.

The [identifier example](/playground/#example=specialization) fixes `INV-DDDD` as its pattern and checks incoming text at runtime.

## Verify complete algorithms at both stages

The [audio mixer](https://github.com/ryblust/carven/tree/v0.1.0/examples/audio_mixer) uses one `const fn` for SIMD mixing, clipping, and statistics. Its static test checks the partial final block; runtime tests also cover invalid gains and mismatched tracks.

The [async scope example](/playground/#example=async-scope) goes further: it starts a child, lets it run, cancels it, and waits for cleanup in both stages. Its static test checks the same result that the running program prints. Use `const async test` to await the flow during compilation and `async test` to await it in a runtime test. Each test owns a root and closes its children before the next test starts.
