---
title: "Compile-time preparation"
description: "Prepare route tables and default settings once, test them before startup, and reuse the same algorithms at runtime."
section: learn
lesson: 13
source: docs/language/constants.md
---

Some inputs are fixed before a program starts: route lists, limits, or default settings. Compute and test those results once during compilation, then use them at runtime. The calculation uses the same values, loops, and failure handling you have already learned.

## Write and verify one algorithm

Save this as routes.cv. Keep only enabled routes whose paths begin with `/`. starts_with performs that prefix check; the rest is an ordinary filtering loop. The two new forms are const fn, which permits compile-time calls, and const test, which checks a result during compilation:

```carven run
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

`const fn` permits compile-time execution; calling `enabled_paths(routes)` in an ordinary runtime initializer still runs at runtime. The call context selects the stage. See the [constant reference](/reference/constants/) for supported operations and execution limits.

## Build a checked configuration

Save this separate program as config.cv. Parse default JSON configuration during compilation, then edit a runtime copy. `Value::parse` creates a value tree; get selects a member and as_i64 reads it as an integer. set replaces a member with a JSON value, and to_json serializes the tree to a String:

```carven run
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

compact is still a String and defaults is still a Value after preparation. Copying defaults into active gives the running program its own editable configuration. `Value::integer(5)` constructs a JSON number; `&&` transfers it into active through set. The modification therefore changes active without changing defaults or compact.

## Recover a parsing failure during preparation

Save this separate program as port_config.cv:

```carven run
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

This prints `8080`: the parser rejects the invalid configured value, and catch supplies a fallback during compilation. Tests must also handle the parser's declared failure:

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

## Run compile-time statements with `const`

Save this separate program as prepare.cv:

```carven run
const "prepare data" {
    var labels: Vector<String> = ["health", "users"];
    labels.push("metrics");
    println("Preparing", labels.length(), "routes");
}

println("Running");
```

`carven check prepare.cv` prints `Preparing 3 routes` during analysis and then reports successful checking. `carven prepare.cv` additionally prints `Running` from its runtime entry. Printing keeps its selected stdout or stderr stream during compilation. `compile --stdout` redirects all compile-time program output to stderr so stdout contains only artifact listings.

The optional label identifies the block in diagnostics. A module block executes once and can read constants, but not runtime values. See the [constant reference](/reference/constants/) for execution order and blocks inside functions.

## Specialize runtime work

A `const` parameter selects a checked specialization while other inputs remain runtime values:

```carven run
fn weighted(value: i32, const (count, weight): (i32, i32)) -> i32 {
    const { println("Preparing weights", count, weight); }

    var total = value;
    const for index in 0..count {
        total += weight + index;
    }
    return total;
}

println(weighted(10, (3, 2)), weighted(20, (3, 2)));
```

The runtime line is `19 29`. The tuple parameter names the static count and weight. The static block prepares the `(3, 2)` instance once, even though the program calls it twice. Static arguments disappear from the runtime signature. `const for` expands the checked range and exposes a static index in each iteration.

`const fn` and static parameters serve different purposes: the former admits static execution, the latter fixes inputs during specialization. Use ordinary loops unless expansion or static values are needed.

## Select compile-time branches with `const if`

A fixed divisor can determine a scaling factor. In this example, zero disables scaling and returns zero; other divisors prepare a factor during compilation. Save this separate program as `scaling.cv`:

```carven run
fn scale(value: i32, const divisor: i32) -> i32 {
    const if divisor == 0 {
        return 0;
    } else {
        const factor = 100 / divisor;
        return value * factor;
    }
}

println(scale(2, 0), scale(2, 4));
```

Run `carven scaling.cv` or `carven interpret scaling.cv`. It prints `0 50`. `const if` selects an arm for each static argument. The zero-divisor instance skips `100 / divisor` in the other arm. Every source arm still receives type, failure, and ownership checks. See the [constant reference](/reference/constants/) for the complete static-selection rules.

## Exercise

Add an enabled `/metrics` route in routes.cv and update its static test. In port_config.cv, change the configured text to `"65536"` and verify that parsing selects the fallback. Run `carven check routes.cv` and `carven check port_config.cv` to execute their static tests, then run each program to inspect its runtime output.
