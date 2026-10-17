---
title: "Prepare configuration and tables at compile time"
description: "Prepare route tables and default settings once, test them before startup, and reuse the same algorithms at runtime."
section: learn
lesson: 13
source: docs/language/constants.md
---

Some inputs are fixed before a program starts: route lists, limits, or default settings. Compute and test those results once during compilation, then use them at runtime. The calculation uses the same values, loops, and failure handling you have already learned.

## Write and verify one algorithm

Save this as routes.cv. We want only enabled routes whose paths begin with `/`. starts_with performs that prefix check; the rest is an ordinary filtering loop. The two new forms are const fn, which permits compile-time calls, and const test, which checks a result during compilation:

```carven
import std::utf using starts_with;

struct Route {
    path: String,
    enabled: bool,
}

const fn enabled_paths(routes: [Route]) -> Vector<String> {
    var result: Vector<String> = [];
    for route in routes {
        if route.enabled && starts_with(route.path, "/") {
            result.push(route.path);
        }
    }
    return &&result;
}

const routes: Vector<Route> = [
    { path: "/health", enabled: true },
    { path: "/users", enabled: true },
    { path: "/debug", enabled: false },
    { path: "missing-slash", enabled: true },
];
const paths = enabled_paths(routes);

const test "enabled absolute paths" {
    check(paths.length() == 2);
    check(paths[0] == "/health");
    check(paths[1] == "/users");
}

for path in paths {
    println(path);
}
```

The output is `/health` and `/users` on separate lines. This builds a variable-length owning result without a separate length calculation or a maximum-size result array. The `[Route]` parameter borrows its input, while the returned vector owns copies of the selected paths.

`const fn` makes the algorithm eligible for compile-time execution. Calling `enabled_paths(routes)` in an ordinary runtime initializer still runs at runtime. The result's stage comes from the call context, not from the fact that arguments happen to be known. Required static calls can reach only explicitly declared `const fn` operations. Definitions are checked before use; dynamic errors and execution budgets are checked when an invocation executes.

## Build a checked configuration

The same preparation can parse a configuration file embedded in the source. Value::parse turns JSON text into an independent value tree. get reads a member. set updates a member. to_json writes compact JSON text. We prepare defaults once, then edit a runtime copy:

```carven
import std::json using Value;

const defaults = Value::parse(r#"{"retries":3,"enabled":true}"#)?;
const compact = defaults.to_json()?;

const test "configuration" {
    let retries = try {
        defaults.get("retries")?.as_i64()?
    } catch {
        _ => fail("configuration must contain integer retries"),
    };
    check(retries == 3);
    check(compact == r#"{"retries":3,"enabled":true}"#);
}

var active = defaults;
active.set("retries", &&Value::integer(5))?;
println(compact);
println(active.to_json()?);
```

Run `carven config.cv` to print:

```text
{"retries":3,"enabled":true}
{"retries":5,"enabled":true}
```

The `const` initializers require execution during compilation. JSON operations use their ordinary typed failures: `?` is still necessary for a known valid input. If a required compile-time calculation fails without recovery, compilation fails. The configuration test uses catch and fail to turn an unexpected parsing failure into a clear test failure.

compact is still a String and defaults is still a Value after preparation. Copying defaults into active gives the running program its own editable configuration. Preparing a value early does not change its type or make runtime copies share mutable contents.

## Recover a parsing failure during preparation

```carven
import std::core using NumberParseError;

const fn configured_port(text: str) -> u16 => try {
    u16::parse(text)?
} catch {
    NumberParseError(_) => 8080,
};

const port = configured_port("invalid");
const test "fallback port" {
    check(port == 8080);
}
println(port);
```

This prints `8080`. Numeric parsing checks the whole input and destination range. An empty string, trailing content, or an out-of-range number is a typed failure; an integer cast would wrap instead of validating. `const explicit_port = u16::parse("443")?;` lets an unhandled parsing failure stop compilation. Inside a test, handle every possible failure, for example:

```carven
const test "parse an explicit port" {
    let port = try {
        u16::parse("443")?
    } catch {
        _ => fail("443 must fit u16"),
    };
    check(port == 443);
}
```

Append this test to the preceding program. It executes during checking and produces no runtime test function.

## Execute preparation without keeping a result

```carven
const "prepare data" {
    var labels: Vector<String> = ["health", "users"];
    labels.push("metrics");
    println("Preparing", labels.length(), "routes");
}

println("Running");
```

`carven check prepare.cv` prints `Preparing 3 routes` during analysis and then reports successful checking. `carven prepare.cv` additionally prints `Running` from its runtime entry. Printing keeps its selected stdout or stderr stream during compilation. `compile --stdout` redirects all compile-time program output to stderr so stdout contains only artifact listings.

The label is optional and identifies the block in diagnostics. A module block executes once. In a function, a block executes once per selected instance or expanded `const for` occurrence. It can read enclosing constants, static parameters and static loop indices, but cannot read runtime parameters or locals. Ordinary runtime conditions do not select static work. Operations in one body execute in source order; separate bodies have no guaranteed preparation order.

## Specialize runtime work

A `const` parameter selects a checked specialization while other inputs remain runtime values:

```carven
fn weighted(value: i32, const weights: (i32, i32)) -> i32 {
    const { println("Preparing weights", weights.0, weights.1); }
    var total = value;
    const for index in 0..weights.0 {
        total += weights.1 + index;
    }
    return total;
}

println(weighted(10, (3, 2)), weighted(20, (3, 2)));
```

The runtime line is `19 29`. The static block prepares the `(3, 2)` instance once, even though the program calls it twice. Static arguments disappear from the runtime signature. `const for` expands the checked range and exposes a static index in each iteration. `const if` chooses which branch appears in the generated function; every source branch must still contain valid code.

`const fn` and static parameters serve different purposes: the former admits static execution, the latter fixes inputs during specialization. Use ordinary loops unless expansion or static values are needed.

## Use text, SIMD, and asynchronous operations at the same stage

UTF encoding, validation, splitting, JSON construction, vectors, and admitted class operations support explicit static execution. SIMD lane algorithms use the same logical contracts at both stages:

```carven
import std::simd.bytes using { block_count, load_block };

const fn count_byte(bytes: [u8], needle: u8) -> usize {
    var count: usize = 0;
    for index in 0..block_count(bytes) {
        let block = load_block(bytes, index * 32);
        count += ((block.value == needle) & block.active).count();
    }
    return count;
}

const zeros = count_byte("A\0B".bytes, 0);
const test { check(zeros == 1); }
println(zeros);
```

It prints `1`. Masking with active lanes excludes zero padding in the final block. Logical SIMD width does not promise one hardware register or a speedup.

A compile-time block or test can also await supported operations declared with `const async fn`; we introduce those forms in the [async lesson](/learn/async/). Static clocks and input observe the compiler process, so using them makes preparation depend on that host. Execution budgets do not impose a wall-clock timeout. Keep reproducible configuration preparation independent of live input and clocks unless that dependency is intentional.

## Exercise

Add an enabled `/metrics` route and update the static tests. Deliberately give the configured port `"65536"` and verify that parsing selects the fallback. Run `carven check` to execute preparation alone, then `carven --tests` for ordinary runtime tests. A failed static check fails compilation; assertions, bounds violations, and execution-budget exhaustion do not become catchable failures.
