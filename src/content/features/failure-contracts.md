---
title: "Compose operations and their failures"
description: "Preserve each failure type and its data, let recovery narrow contracts, and make interface commitments explicit."
section: failure-contracts
source: docs/language/failures.md
---

## Keep failures clear as business logic grows

A missing config can use a default. Denied access needs attention, and an invalid port should retain the rejected text. Carven gives these failures separate types, so callers can handle each one without losing its data.

**Compose operations without defining another aggregate error type at every layer.** The language combines failure sets, preserving the original type identities and payloads until the program reaches a place that can handle them.

<figure class="semantic-sketch">
  <svg viewBox="0 0 640 190" aria-hidden="true" focusable="false">
    <path d="M15 19q84-3 166 1l-2 119q-81 4-164-1ZM184 76q25-3 48 0m-8-6 8 6-8 6" />
    <path d="M246 51q65-3 127 1l-1 50q-65 3-126-1ZM376 75q22-3 44 0m-8-6 8 6-8 6" />
    <path d="M434 38q95-3 187 1l-1 75q-95 3-187-1Z" />
    <path class="sketch-accent" d="M306 106q-2 21 2 43m-7-8 7 8 7-8M255 182q27 2 55-1" />
    <text x="43" y="50">Missing</text><text x="43" y="85">Denied</text><text x="43" y="120">BadPort</text>
    <text x="276" y="82">catch</text>
    <text x="461" y="69">Denied</text><text x="461" y="100">BadPort</text>
    <text class="sketch-accent" x="256" y="175">8080</text>
  </svg>
  <figcaption>Missing becomes the default value 8080. Denied and BadPort still propagate.</figcaption>
</figure>

## Let the language organize result composition

In C++, a result type can express failure with an error type parameter, as C++23's std::expected does. std::variant can collect different payloads, while branches or library combinators organize propagation and recovery. Across layers, the project arranges error sets, carrier conversions, and interface conventions.

During semantic analysis, Carven preserves each failure type, computes the set remaining after handling, and checks implementations against their declared contracts. Generated C++ stores the active failure payload and performs propagation. Source uses ordinary expressions to compute success values and catch arms to describe recovery.

## One task, two expressions

This is the port example from the homepage. Both return 8080 when configuration is missing and leave Denied and BadPort to the caller. Failure types and the implementations of read and parse are omitted. The C++ is a handwritten comparison, not compiler output.

<div class="code-comparison" role="region" aria-label="Choose code language">
<div data-code-choice="Carven">

Carven

```carven
// read: str throw Missing + Denied
// parse: i32 throw BadPort
fn port() -> i32 throw Denied + BadPort => try {
    parse(read()?)?
} catch {
    Missing(_) => 8080,
};
```

</div>
<div data-code-choice="C++">

C++23 · Handwritten equivalent

```cpp
#include <expected>
#include <string_view>
#include <variant>

std::expected<std::string_view,
    std::variant<Missing, Denied>> read();
std::expected<int, BadPort> parse(std::string_view text);

std::expected<int, std::variant<Denied, BadPort>> port() {
    auto text = read();
    if (!text) {
        if (std::holds_alternative<Missing>(text.error())) {
            return 8080;
        }
        return std::unexpected(std::get<Denied>(text.error()));
    }
    auto value = parse(*text);
    if (!value) {
        return std::unexpected(value.error());
    }
    return *value;
}
```

</div>
</div>

| Work                              | Carven expression                   | Organization in this C++ comparison           |
| --------------------------------- | ----------------------------------- | --------------------------------------------- |
| Propagate read and parse failures | `?` at each call                    | Check expected and forward the error payload  |
| Recover only Missing              | A recovery arm in `catch`           | Inspect the active variant alternative        |
| Retain remaining failures         | Check the Denied + BadPort contract | Carry the result in a new expected error type |

C++ result types, variant, and control flow provide the means to express these behaviors; combinators and other result libraries can encapsulate them. Carven makes composition and coverage checking part of language semantics, so the compiler can check which obligations remain after recovery.

Continue with the [complete failure tutorial comparison](/learn/failures/#preserve-the-same-failures-in-c23): run the price-and-fee example to verify identical inputs and short-circuit order, then remove a recovery branch.

For obligations involving storage lifetime, see the [borrowing comparison in the ownership tutorial](/learn/ownership/#who-keeps-borrowed-storage-valid).

## A natural success path with a visible propagation point

Reading a port takes two steps: read the config text, then parse it as a port number. These excerpts assume read returns `str` and declares Missing + Denied, while parse takes `str`, returns `i32`, and declares BadPort.

```carven
private fn load() -> i32 => parse(read()?)?;
```

Each `?` marks a failure exit. If read fails, parse never runs. load is private and omits its `throw` clause, so the compiler infers Missing + Denied + BadPort; no additional error wrapper is needed. Private-function inference also covers forward calls, direct recursion, and mutual recursion.

## Handle the missing file, keep the other failures

The public port function uses 8080 when the config is missing:

<div class="annotated-example">

```carven {1,4}
fn port() -> i32 throw Denied + BadPort => try {
    load()?
} catch {
    Missing(_) => 8080,
};
```

<p class="code-focus-caption">Marked lines: the outward contract and the Missing recovery arm.</p>
<aside class="margin-note">
  <strong>Recovery narrows the contract</strong>
  <p>The two marked lines correspond: fully handling Missing leaves only Denied + BadPort in the public contract.</p>
</aside>
</div>

<div class="example-entry">
  <a href="/playground/#example=typed-failures">Run the complete example in Playground →</a>
  <span>The complete program includes read, parse, and four inputs.</span>
</div>

Handling Missing removes it from the outward contract. Denied and BadPort still reach the caller with their original payloads. The homepage inlines load's expression; the behavior is the same.

A catch that handles only some payloads, or uses a guard, may leave that failure type in the set. The compiler checks actual coverage before removing a type from the contract.

### The compiler computes what remains

The remaining set is derived, not assumed. If port declares only `throw Denied`, the body still lets BadPort escape, and checking fails:

```text
error [CV-EFFECT-SIGNATURE-BOUND]: callable body exceeds its declared failure contract
```

Callers must also handle the remaining failures or declare that they can propagate. The caller below handles only `Denied`, leaving `BadPort` unhandled:

```carven
fn report() {
    try {
        println(port()?);
    } catch {
        Denied(_) => println("access denied"),
    }
}
```

The catch diagnostic names the failure type that is still uncovered, qualified by its module (`config` here):

```text
error [CV-EFFECT-CATCH-NON-EXHAUSTIVE]: catch does not cover every protected failure
note: failure type not fully covered: config.BadPort
```

Because report is published and has no `throw` clause, the compiler also reports `CV-EFFECT-THROW-PUBLISHED`. Adding a `BadPort(error) => ...` arm, or declaring `throw BadPort` on report, resolves both. These excerpts depend on the port definitions above; each diagnostic is shown with its source snippet omitted.

The [tutorial](/learn/failures/) provides complete runnable Carven and C++ versions, with edits to try and behavior to compare.

## Infer internally, commit at the interface

Private helpers, lambdas, and the implicit entry formed by top-level statements infer failure sets as operations compose. Functions visible to module readers, and an explicit `main`, declare allowed types when failures escape. Their implementations are checked against that upper bound. Callers use the declaration without reading the body.

A top-level `println(port()?);` therefore needs no clause: after local cleanup, a failure that escapes the implicit entry is reported with its type and structural payload on stderr, and the program exits with `EXIT_FAILURE`. Handle it with `catch` when the application needs its own message or recovery.

A declared failure remains part of the call contract even when the current implementation never produces it. The implementation can change within the declared set; expanding the set is an interface change callers must address.

## Bring callbacks into the same contract

Failure checking covers functions, closures, and non-owning callable views. A validator that can produce only InvalidAmount can be passed to a policy interface that permits InvalidAmount and LimitExceeded.

```carven
fn process(
    amount: i32,
    policy: fn(i32) -> i32 throw InvalidAmount + LimitExceeded,
) -> i32 throw InvalidAmount + LimitExceeded => policy(amount)?;
```

These failure types are supplied by the policy module. A policy closure that captures a limit can retain the input error and introduce LimitExceeded carrying the actual amount and limit. Callers recover according to the set declared by the interface.

**Pluggable behavior has a checkable failure boundary.** Adaptation checks parameters, successful results, and failure sets. Borrowing and capture lifetime requirements continue to apply.

## Generate native control flow with concrete types

Carven implements failure contracts with C++ results containing concrete alternatives and explicit control flow. An infallible contract uses a direct result. Carven failures travel along this generated path without relying on C++ exception unwinding.

Success paths, failure payloads, local cleanup, and evaluation order jointly determine the generated code. Failures preserve completed side effects; the application defines recovery and rollback. Native C++ exceptions remain the responsibility of native adapters.

## Use the same contracts during compilation

`const fn` can execute throw, propagation, recovery, and rethrow during compilation while retaining ordinary static contract checks. A validator can serve constant configuration and runtime input; the [compile-time tutorial](/learn/constants/#select-compile-time-configuration-with-the-same-failure-contracts) includes a runnable example.
