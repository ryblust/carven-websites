---
title: "Functions: fn, parameters, and results"
description: "Function syntax, calls, expression and block bodies, result types, and static parameters."
section: reference
lesson: 8
source: docs/language/functions.md
---

Use `fn` to name a function. Write each parameter's type after `:`. Call the function with arguments in parentheses. Write `-> R` to state the result type. An expression body uses `=>`; a block body returns with `return`.

## Declarations and calls

```carven
fn subtotal(unit_price: i32, quantity: i32) -> i32 => unit_price * quantity;

fn with_delivery(total: i32) -> i32 {
    return total + 5;
}

println(with_delivery(subtotal(12, 3))); // 41
```

An ordinary named function requires types on all parameters. Names must be unique; `_` discards a parameter name and may repeat. A call supplies exactly the declared number of arguments, with matching types and Read/Write/Take markers. Functions do not overload and have no default or variadic parameters.

The callee is evaluated first, then runtime arguments once from left to right. A concrete closure selects its object; a callable view saves its target description. The target reads its current captures after argument evaluation. Copy a closure explicitly when a separate capture snapshot is needed.

An `async fn` returns an operation whose body starts when awaited or started as a child; see [async operations](/reference/async/). `const fn` permits a function to run during compilation when called from an explicit constant context; ordinary calls still run at runtime.

## Result inference

A function with a body may omit `-> R`. The compiler checks each return expression independently. Their result types must agree. The caller's expected type and earlier returns do not supply context to later returns. An explicit result annotation instead supplies the expected type to every return. Native results must have the same Carven type identity; write the result type when compatibility needs C++ resolution.

A body with no return operands infers `void`. Bare `return;` also requires `void`. For any other result type, each path that completes normally must return a value. A missing return produces `CV-FLOW-MISSING-RETURN`. Return operands that cannot complete normally contribute no result type. Nested callable failure contracts must also agree. A declaration without a body defaults to `void` if its result is omitted.

`=> expression` returns that expression under the same access, lifetime, and failure rules as `return expression;`. A void expression is valid, including `return action();`. Propagating a fallible result requires `?`, as in `return action()?;`. A block's final expression is not an implicit return.

## Parameter access

Read lets a function inspect an argument, Write (`&`) lets it change the caller's storage, and Take (`&&`) transfers the value to the function. These modes determine what the function may do; the following rules also determine when it observes the input's contents. See [access and ownership](/reference/ownership/) for examples.

Read parameters snapshot pure Carven values and borrow Carven owned storage.
For native-containing values, C++ chooses a const value when copy construction
and destruction are both trivial, and a const reference otherwise. A parameter
whose storage must survive the call uses a const reference throughout the call
chain. Write permits mutation through borrowed storage; Take transfers ownership.

Function and lambda parameters may use recursive tuple targets, for example
`fn sum((left, right): (i32, i32)) -> i32 => left + right;`. A tuple target
still occupies one parameter position. Access markers apply to the complete
parameter: Read and Write names project its existing storage, while Take names
are independent immutable owners. Names are unique across the entire parameter
list. A static parameter may likewise use a tuple target; lambda targets may
infer their complete type from an expected callable view. Targets match the
parameter type's arity and nesting.

## Recursion and declaration order

Function declarations may refer to later declarations because function identities
and heads are collected before bodies. Expression-body results are completed on
demand before a dependent function reference is used. A cycle that requires an
unfinished result is rejected with `CV-TYPE-RESULT-INFERENCE-CYCLE`; add an
explicit `-> T` to break the signature dependency. Result completion uses
declaration signatures and body inference; operator constraints, constant
branches, and caller context do not resolve a signature cycle.

## Parameterized functions

Use a type parameter when one function should work with more than one value type. In the example below, `T` is the type of the value being transferred; callers can use the same function for an integer, a String, or another admitted type.

Declare type and failure-set parameters after the function name. The compiler checks the body against those parameters, even when the function is unused. A plain name declares a type parameter; `throw E` declares a
failure-set parameter. The two kinds are distinct.

```carven
fn relay<T>(&&value: T) -> T => &&value;

let number = 42;
let result = relay(&&number);
```

An unknown type supports Read and Write access and whole-value Take. It provides
no implicit copying, default construction, comparison, or formatting capability.
Known arrays, slices, Tuple shapes, and nominal fields retain their ordinary
operations. Array extents and nominal failure payload types must be independent
of type parameters. A failure-set parameter represents a set of those payload
types, including the empty set.
Named external C++ types may depend on type parameters. Their native
construction, calls, and conversions are checked by C++ after concrete
substitution.
Parameterized closures, callable-view signatures that depend on rigid type or
failure parameters, and `import(cpp)` or `export(cpp)` parameterized function
declarations are not supported.

Operations can retain type formation requirements. Dereferencing `ptr<T>`, for
example, requires a non-void target. The requirement follows generic forwarding
calls; supplying `void` is rejected even inside an unused generic caller. Native
pointer targets retain the ordinary delegated C++ type contract.

An explicit application such as `relay<i64>(&&value)` supplies every argument
in its declared kind and provides the substituted parameter types as argument
context. A failure-set argument uses `throw`, for example
`consume<i32, throw Error + IO>(&&pending)` or
`consume<i32, throw ()>(&&pending)`. For scalar parameters, omitting the explicit
clause requests bounded inference from the public signature, actual argument
types, and immediate expected result.
It does not inspect the body or previous applications. A whole parameter such as
`Operation<T, throw E>` can infer both its success type and its failure set;
inference does not recover a unique `E` from an ambiguous union such as
`E + Error`. Missing or conflicting evidence requires explicit arguments.
Each actual argument is evaluated once.

An actual type or failure set may depend on an inferred callable contract.
The compiler first completes those declarations, then selects the concrete function instance. It does not treat an unfinished failure set as empty.
This also applies to generic calls in static roots.

`const fn` definitions use the same universal rules and require semantically
reachable source calls to select known `const fn` targets. Static calls need concrete
type and failure-set arguments. A body-local `const` initializer cannot require an
unresolved generic environment; ordinary generic calls can execute once their type
and failure-set arguments are concrete.
Recursion requires a completed result signature. Concrete applications share
instances keyed by the definition and ordered canonical type or failure-set
arguments.

Ownership analysis can combine borrowing relationships from different calls to the same generic function. It can therefore reject code that needs those relationships to remain separate, even when each call would be safe alone.

## Static parameters

A named function parameter may declare an explicit static input with
`const name: T`. Calls retain ordinary argument syntax and full source arity:

```carven
fn add(value: i32, const offset: i32) -> i32 {
    const adjusted = offset + 1;
    return value + adjusted;
}

fn relay(value: i32, const offset: i32) -> i32 => add(value, offset);

fn example(value: i32) -> i32 {
    const offset = 2;
    return relay(value, offset);
}
```

The parameter is an immutable value, without source-addressable storage. It
cannot combine `const` with Write (`&`) or Take (`&&`). Literal expressions,
explicit constants, enclosing static parameters and admitted operations on those
values can supply the input. Calls to `const fn` can compute it. A wrapper must
repeat the `const` parameter contract when forwarding a static input.

An ordinary runtime `let`, `var`, parameter, or `for` index does not qualify.
Inside a `const` block or `const test`, all local values belong to the static
stage and can supply static inputs at the call.

`const fn` and `const` parameters express separate properties: the former permits
execution of the function in static roots, while the latter fixes
an input at compilation. An ordinary function can have static parameters and
still execute its body at runtime. Declaring both does not move an ordinary call
or its runtime arguments to compilation.

Static argument expressions are evaluated and frozen in source order during
specialization. The residual call then evaluates the callee and runtime arguments
in source order. A `const fn` body uses these same specialization stages even
when called during static execution. Inside a `const` block or `const test`,
arguments instead execute together in source order, and the call selects an
instance using the resulting static values.

The compiler selects an instance by the source function and typed static values.
The generated C++ signature contains only runtime parameters. Two source calls
with equal static values can share that instance, while each static argument
expression retains its own static execution. Body-local `const` initializers
are static roots in their static environment.

Functions with static parameters require direct calls and cannot be imported from
or exported to C++. Lambda parameters and callable-view types do not accept
`const` parameters.

Async source functions use the same static-parameter instance selection. The
residual body keeps its async execution identity and only runtime parameters are
captured by the cold operation. `const async fn` additionally permits cooperative
static execution through await and lexical children. A synchronous
`const fn` can return a cold operation without executing it.

## Static control

Stage selection is explicit. In a runtime body, ordinary `if`, `&&`, `||`, and `for` retain runtime
semantics and do not require static operands, and the values of their operands
never select what is analyzed or executed in the static stage. Every static root
and static argument inside ordinary control is required in each instance that
reaches the construct.

Inside a `const` block or `const test`, ordinary control executes in the static
stage and selects the statements that execute. Types and contracts are still
checked in every source arm.

`const if` selects one arm per instance. Every condition of the chain, including
each `else if`, must be a static expression. All arms undergo name, type,
failure-contract, ownership, and return analysis, which static values cannot
change: the function has one contract for all its instances. Only the selected
arm is specialized
and generated; local initializer roots and static call arguments in other arms
are not evaluated during specialization:

```carven
fn scale(value: i32, const divisor: i32) -> i32 {
    const if divisor == 0 {
        return 0;
    } else {
        const factor = 100 / divisor;
        return value * factor;
    }
}
```

`scale(x, 0)` never evaluates `100 / divisor`.

Type formation still computes constant extents in every arm before
specialization, without executing their declarations. A `const { ... }` block
executes with the body's local constants once per selected instance or expanded
occurrence; runtime control does not select or repeat it.

`const for` expands a Read integer range, array, slice, Vector, or character view
whose source is static. The source evaluates once and remains alive during
expansion. Each iteration's binding is a static value with the source element
type, so it can supply static arguments and local constants:

```carven
fn add(value: i32, const offset: i32) -> i32 => value + offset;

fn sum(value: i32, const count: i32) -> i32 {
    var total = 0;
    const for index in 0..count {
        total += add(value, index);
    }
    return total;
}
```

In a runtime body, `const alias = index` preserves the static stage;
`let alias = index` does not.
Each iteration has its own scope while outer variables remain shared. `break`,
`continue`, `return`, and failure propagation keep their ordinary meaning.
Reversed integer ranges and empty sources have no iterations. Each bound element
must freeze without changing its declared type; a discarded element needs no
retained value. The source itself need only support execution and traversal.
Expansion has cumulative iteration, instance, nesting, and construction limits.
Exceeding a limit is a compiler diagnostic.

A `const for` may also appear at module scope. It expands statements in the
module's runtime entry body; ordinary calls in those statements run at runtime.
A `const { ... }` block instead executes its entire body during compilation.

Unselected `const if` arms, iterations after a static `break`, and statements after
a static exit are checked in the source body and omitted from specialization.

## Compile-time capability

`const fn` permits static execution without moving ordinary calls into compilation. Class operations may also declare it. See [constants](/reference/constants/) for capability checks, host effects, and freezing.

## Failure contracts of entries

Explicit entries with outward failures require a declared `throw` contract. An implicit entry infers its outward set. See [entries](/reference/entry-testing/) and [failure contracts](/reference/failures/).
