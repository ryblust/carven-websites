---
title: Where syntax ends and inference begins
description: Reserved words, contextual names, expected types, and the choices a program states explicitly.
section: internals
source: docs/language/grammar.md
---

## Give each spelling a defined role

Carven distinguishes grammatical structure from names resolved by the compiler. This matters when choosing identifiers and when reading code: a familiar spelling is not necessarily a globally reserved keyword.

| Form                                                                                | How its role is selected                                                                                                                                               |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fn`, `if`, `let`, `throw`, and the other [reserved keywords](/reference/keywords/) | The lexer emits dedicated tokens; ordinary declarations cannot use them as names                                                                                       |
| `self`, `&self`, `&&self`                                                           | In class operation parameters, `self` must be the first, untyped receiver and selects its access. Ordinary bindings and free-function parameters may use the same name |
| `cpp`                                                                               | The identifier selects a native boundary inside `import(cpp)` or `export(cpp)`, or an opaque source fragment in `#[cpp]`                                               |
| `ptr<T>`                                                                            | In type position the parser recognizes the ordinary identifier `ptr` and requires the pointer-type form, rather than ordinary type-name lookup                         |
| `r`, `f`, `c`                                                                       | Adjacency to the appropriate string delimiter selects a literal prefix; a standalone spelling is an identifier                                                         |
| `println`, `assert`, and the other [builtin callables](/reference/builtins/)        | Ordinary name lookup selects them; a user declaration can shadow them                                                                                                  |
| `i32`, `String`, and other builtin type names                                       | Semantic analysis resolves the builtin types and reserves their names against module declarations                                                                      |

The current grammar specifically calls `self` a **contextual keyword**. Within class operation parameters it must occur first and without a type annotation; a free function's typed parameter or a local binding may use the same name. The other context-sensitive forms above have their own parsing or lookup rules; being meaningful in a context does not make every such name a keyword. Module paths are a further defined exception: their components admit reserved keyword spellings too.

```carven
class Counter {
    value: i32,
    fn create(value: i32) -> Counter => { value: value };
    fn read(self) -> i32 => self.value;
}

let self = 4;
let cpp = Counter::create(self);
println(cpp.read()); // 4
```

The receiver form provides its type from the enclosing class and uses the existing Read, Write, and Take rules. An operation without a receiver is associated with the class; it needs no `static` modifier. Keeping special interpretation at the relevant construct lets ordinary names remain ordinary elsewhere.

## Let context fill in a type, within a boundary

An annotation, assignment destination, parameter, return type, or field can provide an expected type. That type can select an unsuffixed literal's numeric type, an enum's `.Case`, or the type of a named-field construction. The [type reference](/reference/types/) specifies the admitted sources and conversions.

```carven
enum State { Ready, Busy }
let state: State = .Ready;
assert(state == .Ready);

let count: usize = 3;
let next = 1 + count;
println(next); // 4
```

Here the direct unsuffixed `1` adopts the right operand's `usize` type. This is literal typing, not promotion of an existing `i32` value. If `1` had first been stored in an unannotated binding, that binding would already be `i32`; its later uses would not revise its type. Grouping receives an expected type but does not qualify as a direct literal for this sibling-selection rule.

This boundary keeps inference local. Ordinary Carven values do not gain general numeric promotions, truthiness, or structural conversions. When context cannot determine a contextual form, write its type explicitly. Native C++ operations retain their separately delegated conversion rules.

## Keep behavior-changing choices visible

Type context supplies neither a missing call-access marker nor a closure capture. A Write argument repeats `&`; a Take argument repeats `&&`. Returning a named owner requests a copy and must meet the applicable copy-construction requirements; transferring it requires `return &&owner;`. Copying a view retains its backing relationship rather than extending the referent's lifetime.

These rules also define choices that need no extra token at every use. Ordinary calls evaluate the callee, then runtime arguments once from left to right. Write access permits aliases; it is not an exclusive borrow. A Read argument may observe changes through another alias when its representation retains the original storage. An explicit owning copy creates a separate immediate value, but contained views and Write captures still refer to their original backing. The [ownership reference](/reference/ownership/) explains the storage and lifetime consequences.

For failures, `?` selects propagation and `try` establishes recovery. Recovery preserves mutations and external effects already completed; it does not imply a transaction. Rollback belongs to the application's algorithm. The failure contract tells the caller what may remain after recovery.

## Separate permission from execution stage

`const fn` permits required static execution; it does not move every call to compilation. A `const` parameter fixes an input for specialization while the residual function may still execute at runtime. `let` alone does not require compile-time execution; its stage comes from the enclosing execution context. A runtime `let` cannot supply a static parameter, even when initialized by a literal. In a `const` block or `const test`, local bindings execute with the block at compilation.

`const if` selects the generated arm, but every source arm still receives name, type, access, ownership, and failure-contract checking. It is a specialization mechanism with one source contract, rather than a way to hide ill-typed code. The [compile-time article](/features/compile-time/) develops the construction model; the [function reference](/reference/functions/) states the stage-selection rules.

## Build on the mechanisms already available

Three concrete directions fit this division without adding syntax:

- Compose the existing UTF and SIMD APIs into scanning algorithms in ordinary Crafts. The library chooses its algorithm; builtin operations retain their lane, memory, and execution-stage contracts.
- Generate bounded tables or text with `const fn`, static execution roots such as constant initializers and `const` blocks, and the admitted construction and freezing rules. Resource limits and static result restrictions remain part of the contract.
- Put native recovery policy in a C++ adapter, then expose the chosen result through an explicit boundary. The adapter catches native exceptions before a terminating boundary and establishes the external lifetime obligations.

Further language extensions need a concrete use that these forms cannot adequately express. Settle where context comes from, what changes to access or lifetime are visible, and how static and native execution agree. A small accepted example, a nearby rejected example, and its generated implementation make those choices testable. This follows Carven's [design principles](https://github.com/ryblust/carven/blob/main/docs/development/principles.md): source states meaningful commitments, inference derives defined facts, and later stages realize them.
