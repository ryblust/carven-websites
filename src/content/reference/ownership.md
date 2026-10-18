---
title: "Access and ownership"
description: "Read, Write, Take, copying, restoration, aliasing, temporaries, and scoped cleanup."
section: reference
lesson: 12
source: docs/language/ownership.md
---

## Bindings and access

A local `let` or `var` owns its value: that binding keeps the value alive until its scope ends. A borrowed view, such as `str` or a slice, reads storage owned elsewhere and does not keep it alive. Copying an owning String creates independent text; copying a view keeps referring to the original text.

Read, Write, and Take describe how a function may use an argument: read it, change its existing storage, or receive ownership. Carven treats these permissions separately from the value's type. Binding and argument
markers `&` and `&&` describe access; they do not construct reference types.
Inside `ptr<&T>`, `&` is the pointer type's explicit target-access parameter.

| Form                       | Binding or access                                       |
| -------------------------- | ------------------------------------------------------- |
| `let`                      | Immutable runtime owner                                 |
| `var`                      | Mutable runtime owner                                   |
| Local `const`              | Static binding                                          |
| Unmarked parameter         | `Read` access                                           |
| Parameter marked `&`       | `Write` access                                          |
| Parameter marked `&&`      | `Take` access                                           |
| Unmarked range binding     | `Read` element access                                   |
| Range binding marked `&`   | `Write` element access when the source permits mutation |
| Unmarked pattern binding   | `Read` access to the selected value                     |
| Pattern binding marked `&` | `Write` access when the subject permits mutation        |

See [variable declarations and scope](/reference/bindings/) for initialization,
shadowing, discard bindings, and tuple targets.

A call repeats every declared parameter access exactly: `read(value)`,
`write(&value)`, or `take(&&value)`. `Read` grants non-owning read-only access,
`Write` grants non-owning mutable access, and `Take` transfers ownership. Write
access permits but does not require mutation. It is non-owning and nonexclusive:
the same mutable owner may be passed to multiple `Write` parameters in one call.
Arguments are evaluated left to right, and mutations take effect in the
function body's execution order. Read prevents writes to the parameter's current
storage. Contained pointers and Write captures retain their separate target access.

## Read values and aliases

A Read parameter borrows array, Vector, String, and closure storage through const references. This includes storage nested in structs or tuples. Other pure Carven values use const value snapshots. Native-containing values use a const value
when C++ copy construction and destruction are both trivial, and a const
reference otherwise. Object size does not affect this choice.

Some results or external state retain access to a parameter object. In that case, the parameter uses a const reference throughout the call chain. This also covers argument temporaries and native wrappers. Async native-containing Read parameters
retain their holders from cold construction until operation closure.
`import(cpp)` and `export(cpp)` use the same policy. Callable views use the
ordinary value-or-reference policy; a target requiring stable native storage
cannot adapt to a view that lacks that borrowing contract.

Pattern and range Read bindings are non-owning. They snapshot pure Carven
values and borrow storage-containing values, including native holders, from the
selected subject or current element.

A by-value Read argument saves its value when that argument is evaluated. A
by-reference Read argument retains the selected storage, so writes through
another alias can affect subsequent reads. An explicit owning copy establishes
a separate value before the call; non-owning contents in that copy retain their
referents. Both representations obey the same access markers and Take-conflict
checks.

## Take and availability

Runtime `let`, `var`, and `Take` parameters are owners. A `Take` parameter is an
immutable owner and may itself be taken.
`Read` and `Write` parameters, pattern and range bindings, closure state, and
`const` are not Take sources. The initial Take operand must be a complete owner or a
temporary; taking a member or element of a still-available owner is invalid.

```carven run
fn relay<T>(&&value: T) -> T => &&value;

var values: Vector<i32> = [1, 2, 3];
let moved = relay(&&values);
values = [4, 5];
println(moved.length(), values.length()); // 3 2
```

Tuple parameter and loop targets inherit these access rules. Named slots in a
Take parameter are independent immutable owners; Read and Write targets remain
projections of the enclosing parameter or current element. Positional fields
such as `.0` obey the same complete-owner restriction as named fields.

Field selection from an owning value transfers the selected field using the
ordinary Carven value-delivery policy. `(&&owner).field` first consumes the
complete owner; the complete source is evaluated once and retained through the
full expression, with remaining fields cleaned up normally. Nested owning field
selection follows the same rule. `owner.field` remains an ordinary Read and
never consumes `owner`. Returning a view into a destroyed temporary is invalid.
Tuple binding targets decompose a value into independently owned element bindings
with matching arity and nesting.

`&&expression` is the ownership-transfer expression and has its operand's value
type. Taking a complete owner makes that binding unavailable, including for a
copyable type. Analysis checks this state transition; the selected C++ operation
must preserve its ownership and observable effects.

Returning a named owner requires copying that value. Use `return &&owner;` to transfer it; returning does not select Take implicitly. `CV-LINT-RETURN-COPY` reports a returned owner whose type can hold Carven
`String` storage by value, excluding zero-length array elements, and has no
native value component, when Take is admitted at that return in every analyzed
call context. Writing `return &&owner;` states the transfer and removes the warning.

Every use of an unavailable binding is invalid. A complete plain assignment to
a `var` is the only operation that may restore it, and restoration happens only
after the right-hand side completes normally. Partial assignment, compound
assignment, and update operators require the prior value. At a control-flow
join, a binding is available only when it is available on every normally
continuing path. Condition effects are checked before proven Boolean results
select the possible normal paths. Loops include possible zero-iteration paths
and all normally continuing backedges.

Member and element mutation inherit eligibility from their receiver. Plain
assignment requires a compatible value and uses the target C++ assignment
operation; it does not end the destination object's lifetime and reconstruct it.
A complete writable owner may be consumed by its RHS and restored by a normally
completed assignment, as in `x = relay(&&x)`. If the RHS fails, the owner remains
unavailable. Direct self-transfer assignment `x = &&x` is invalid, including
parenthesized forms. Member and compound assignment still require the old value.
Compound `+`, `-`, `*`, and `/`
assignment require numeric operands; `%`, bitwise, and shift assignment require
integer operands. Increment and decrement require an integer target. Assignment
evaluates the target before the new value, once each.

Take cannot conflict with a place access retained by an unfinished call,
including its callee and outer call arguments. A completed independent result
retains no read access to its inputs: `f(x + 1, &&x)` and
`f(identity(x), &&x)` are valid when their results are independent values.
Direct `f(x, &&x)` is invalid regardless of the target Read parameter policy.
Value-capture snapshots are
independent after creation, but capture creation requires the source to be
available. Lambda captures and range bindings do not support Take access.

A Write capture remains active with every live value that directly or
transitively contains its closure. Moving the closure into an aggregate,
projecting or reading it back out, and carrying it through a control-flow
result preserve that association. The capture ends with its actual holders,
not with the expression that created it; its source cannot be taken while any
such holder remains live.

## Assignment and lifetimes

Initializing an owner from an existing value without `&&` copies that value;
the source remains available. Initializing from `&&owner` transfers ownership
and changes source availability. An independently produced temporary can be
delivered to its destination without creating another source binding. These
are value and availability rules, not a fixed count of native constructor calls.

A copy owns its immediate value, including structure fields, array elements,
and enum payloads. Non-owning contents retain their backing: copying `str`, a
callable view, or a closure containing Write captures does not clone or prolong
the referenced storage. A copied view retains its escape restrictions, and every
live closure copy retains its Write-capture associations.

Local owners live in their enclosing lexical scope. Exiting that scope by
normal completion or a control transfer ends its local lifetimes. Temporary
storage belongs to the full expression that evaluates it unless an explicit
construct retains it, such as an owned match subject or a temporary range
source. Delivering a result into a longer-lived owner does not prolong the
lifetimes of that result's borrowed backing. Carven has no source destructor
or general lifetime-extension syntax.
