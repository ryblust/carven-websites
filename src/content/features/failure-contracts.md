---
title: "Compose operations and their failures"
description: "Preserve each failure type and its data, let recovery narrow contracts, and make interface commitments explicit."
section: failure-contracts
source: docs/semantics.md
---

## Keep failures clear as business logic grows

A missing config can use a default. Denied access needs attention, and an invalid port should retain the rejected text. Carven gives these failures separate types, so callers can handle each one without losing its data.

**Compose operations without defining another aggregate error type at every layer.** The language combines failure sets, preserving the original type identities and payloads until the program reaches a place that can handle them.

## Let the language organize result composition

In C++, a result type can express failure with an error type parameter, as C++23's std::expected does. std::variant can collect different payloads, while branches or library combinators organize propagation and recovery. Across layers, the project arranges error sets, carrier conversions, and interface conventions.

During semantic analysis, Carven preserves each failure type, computes the set remaining after handling, and checks implementations against their declared contracts. Generated C++ stores the active failure payload and performs propagation. Source uses ordinary expressions to compute success values and catch arms to describe recovery.

## A natural success path with a visible propagation point

Reading a port takes two steps: read the config text, then parse it as a port number. These excerpts assume read returns str and declares Missing + Denied, while parse takes str, returns i32, and declares BadPort.

```carven
private fn load() -> i32 {
    return parse(read()?)?;
}
```

Each `?` marks a failure exit. If read fails, parse never runs. The compiler infers Missing + Denied + BadPort for load; no additional error wrapper is needed. Private-function inference also covers forward calls, direct recursion, and mutual recursion.

## Handle the missing file, keep the other failures

The public port function uses 8080 when the config is missing:

```carven
fn port() -> i32 throw Denied + BadPort {
    return try {
        load()?
    } catch {
        Missing(_) => 8080,
    };
}
```

Handling Missing removes it from the outward contract. Denied and BadPort still reach the caller with their original payloads. The homepage inlines load's expression; the behavior is the same.

A catch that handles only some payloads, or uses a guard, may leave that failure type in the set. The compiler checks actual coverage before removing a type from the contract.

The [tutorial](/learn/failures/) provides complete runnable Carven and C++ versions, with edits to try and behavior to compare.

## Infer internally, commit at the interface

Private helpers and lambdas infer failure sets as operations compose. Functions visible to module readers explicitly declare allowed types when failures escape. Their implementations are checked against that upper bound. Callers use the declaration without reading the body.

A declared failure remains part of the call contract even when the current implementation never produces it. The implementation can change within the declared set; expanding the set is an interface change callers must address.

## Bring callbacks into the same contract

Failure checking covers functions, closures, and non-owning callable views. A validator that can produce only InvalidAmount can be passed to a policy interface that permits InvalidAmount and LimitExceeded.

```carven
fn process(
    amount: i32,
    policy: fn(i32) -> i32 throw InvalidAmount + LimitExceeded,
) -> i32 throw InvalidAmount + LimitExceeded {
    return policy(amount)?;
}
```

These failure types are supplied by the policy module. A policy closure that captures a limit can retain the input error and introduce LimitExceeded carrying the actual amount and limit. Callers recover according to the set declared by the interface.

**Pluggable behavior has a checkable failure boundary.** Adaptation checks parameters, successful results, and failure sets. Borrowing and capture lifetime requirements continue to apply.

## Generate native control flow with concrete types

Carven implements failure contracts with C++ results containing concrete alternatives and explicit control flow. An infallible contract uses a direct result. Carven failures travel along this generated path without relying on C++ exception unwinding.

Success paths, failure payloads, local cleanup, and evaluation order jointly determine the generated code. Failures preserve completed side effects; the application defines recovery and rollback. Native C++ exceptions remain the responsibility of native adapters.
