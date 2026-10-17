---
title: "Prepare data before your program runs"
description: "Parse configuration, retain its result, and test the same algorithms at compile time and runtime."
section: compile-time
source: docs/language/constants.md
---

## Prepare a configuration template once

A program may start from the same configuration template on every run. Parse that fixed input during compilation, then make an independent copy when the running program needs to change it.

In this example, `const defaults` asks the compiler to parse the JSON now. `configure` is an ordinary function: it copies the template and applies runtime settings. `const test` checks that the parsed template starts with the expected worker count.

```carven
import std::json using { Value, ValueError };

const defaults = Value::parse(r#"{"workers":2,"tags":["stable"]}"#)?;

fn configure(workers: i64) -> String throw ValueError {
    var config = defaults;
    config.set("workers", &&Value::integer(workers))?;
    var tags = config.get("tags")?;
    tags.push(&&Value::string("observed"))?;
    config.set("tags", &&tags)?;
    return config.to_json()?;
}

const test "the template starts with two workers" {
    check(try {
        defaults.get("workers")?.as_i64()? == 2
    } catch { ValueError(_) => false });
}

println(configure(8)?);
println(defaults.to_json()?);
```

The runtime output shows the changed copy followed by the original template:

```text
{"workers":8,"tags":["stable","observed"]}
{"workers":2,"tags":["stable"]}
```

`Value` owns its strings and collections, so the two trees can be changed independently. `get("tags")` also returns an independent child value; after appending a tag, `set` puts that changed child back into the configuration. `&&` transfers the child into the receiving container.

[Run the configuration example](/playground/#example=json-config), change the worker count or add a tag, and compare the two output lines. The JSON library's parsing, mutation, and writing functions are `const fn`, so the same operations can run in either stage.

## Keep the result's type

At the end of constant initialization, Carven freezes the result: it retains an immutable value for later use. An owned `String` remains `String`; a `Vector<T>` keeps its elements and capacity; nested JSON values keep their owned contents. Copying one into a mutable binding creates independent storage.

An explicit `str` destination can retain a view of the completed text instead. Its bytes have program-lifetime storage. Ordinary borrowed values still follow their lifetime rules: a function cannot return a view into one of its local owners.

This lets you build lookup data, Unicode text, or configuration with ordinary loops and mutable locals, then retain the result without writing a second static representation.

## Choose the execution stage

`const fn` makes a function available for compile-time execution. A `const` initializer requests that execution and keeps the result. `const { ... }` performs compile-time work without keeping a result; `const test` runs assertions during checking, including `carven check`. An ordinary call to the same function stays at runtime, even with literal arguments.

The compiler checks whether a `const fn` and its reachable calls support execution at that stage. Explicit static execution can also use the compiler process's input, clocks, waits, and output. Those effects occur during compilation; completed effects remain observable if a later step fails.

Execution has budgets for steps, text, and aggregate work. External C++ calls need native execution, and type-forming queries have additional restrictions on host effects. The [constant reference](/reference/constants/) defines these rules and the supported operations.

## Specialize runtime work with known inputs

Sometimes only the configuration is known ahead of time. A `const` parameter fixes that input while other parameters carry runtime data. `const if` chooses a branch for the instance; `const for` expands a static sequence. All source branches still receive type, access, and failure checks.

The [identifier example](/playground/#example=specialization) fixes `INV-DDDD` as its pattern and checks incoming text at runtime. SIMD extraction can fix an offset in the same way. Formatting can prepare fixed text and numeric formats while leaving the changing values for runtime conversion.

## Verify complete algorithms at both stages

The [audio mixer](https://github.com/ryblust/carven/tree/main/examples/audio_mixer) uses one `const fn` for SIMD mixing, clipping, and statistics. Its static test checks the partial final block; runtime tests also cover invalid gains and mismatched tracks. The [log analyzer](https://github.com/ryblust/carven/tree/main/examples/log_analyzer) checks credential redaction during compilation and retains an owned JSON report template.

The [async scope example](/playground/#example=async-scope) goes further: it starts a child, lets it run, cancels it, and waits for cleanup in both stages. Its static test checks the same result that the running program prints.
