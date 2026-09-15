---
title: "Compose operations and their failures"
description: "Preserve each failure type and its data, let recovery narrow contracts, and make interface commitments explicit."
section: failure-contracts
source: docs/semantics.md
---

## Keep failures clear as business logic grows

A stock failure needs the remaining quantity; a delivery failure needs the destination; an invalid quantity needs the rejected input. Carven lets these failures travel through functions as their own structures or enums. A composed interface still identifies each possibility.

**Compose operations without defining another aggregate error type at every layer.** The language combines failure sets, preserving the original type identities and payloads until the program reaches a place that can handle them.

## Let the language organize result composition

In C++, a result type can express failure with an error type parameter, as C++23's std::expected does. std::variant can collect different payloads, while branches or library combinators organize propagation and recovery. Across layers, the project arranges error sets, carrier conversions, and interface conventions.

Carven brings that work into semantic analysis: composition preserves nominal types, handling computes the remaining set, and published interfaces check upper bounds. Generated C++ stores the active payload and performs propagation. Source keeps the shape of successful computation and business recovery.

## A natural success path with a visible propagation point

An order quote combines an item total and a delivery fee. In this excerpt, line_total declares QuantityError and OutOfStock; delivery_fee declares DeliveryError. Both return i32.

```carven
private fn primary_quote(
    quantity: i32,
    available: i32,
    zone: i32,
) -> i32 {
    return (line_total(quantity, available) + delivery_fee(zone))?;
}
```

The addition keeps the shape of the business calculation, and `?` marks the failure exit for the whole expression. The compiler infers three failure types for this private function. If the first operation fails, neither the second operation nor the addition executes.

**A propagation marker can cover a composed expression.** Readers can see the failure exit and follow the success path from left to right. Private-function inference covers forward calls, direct recursion, and mutual recursion.

## Handling a problem reduces the caller's responsibility

A quote interface that supports pickup can fall back to the item total when delivery fails:

```carven
fn pickup_quote(
    quantity: i32,
    available: i32,
    zone: i32,
) -> i32 throw QuantityError + OutOfStock {
    return try {
        primary_quote(quantity, available, zone)?
    } catch {
        DeliveryError(_) => line_total(quantity, available)?,
    };
}
```

This excerpt uses the same providers and failure types. The catch completely covers DeliveryError from the protected body, leaving only QuantityError and OutOfStock in the outward interface. Failures from the fallback calculation are checked against that same interface contract.

**Recovery changes the contract callers must face.** Handling only one enum case, or using a guard to select some cases, leaves the other possibilities in the set. The compiler computes the remainder from actual coverage.

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
