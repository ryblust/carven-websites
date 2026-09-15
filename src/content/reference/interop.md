---
title: "C++ names, operations, and boundaries"
description: "Headers, native types, source fragments, scalar interfaces, exceptions, and returned borrows."
section: reference
lesson: 15
source: docs/semantics.md
---

## Headers and external names

```carven
import <vector> using std::vector;
import "provider.hpp" using vendor::{Widget, create};
import <cstdio> using std::printf;
```

Carven does not parse headers. An import without using creates no Carven name. Leading :: selects a C++ global name directly in expressions, types, casts, and construction. Carven does not require a prior header import; C++ checks actual declaration visibility.

An explicit using binds the final component to a full external path. Repeating the same path is allowed; using one name for different paths is an error. Explicit selections precede namespace wildcards, and all equivalent explicit sources are marked used together. C++ handles overloads on one path; overloads are not merged across paths. List items must be simple identifiers, without aliases, nested lists, or wildcards inside lists.

Local and module declarations retain ordinary lookup. External imports cannot collide with local module declarations. Only unresolved names consult open C++ namespaces. External names apply within the current module and are not re-exported through Carven module imports. Explicit selections receive unused diagnostics; namespace wildcards do not.

## Types, construction, and conversions

External template arguments can only be types and may nest. This does not provide Carven user generics. Native `T { ... }` uses positional initialization and may be empty. Native types in signatures and fields must be named explicitly; local owners may infer them from native expressions.

When destination and value types differ and at least one is native, ordinary initialization, assignment, Read/Take arguments, returns, aggregates, and typed value branches delegate destination construction to C++, including narrowing constraints. Write parameters retain source storage and let C++ check reference binding; & and writability checks still apply. An explicit as with either side native generates static_cast<T>.

Native conditions convert to bool; &&/|| preserve Carven short-circuiting. C++ checks native unary and nonlogical binary overloads and result types. Once inferred as an external expression type, a value does not automatically become Carven i32 even if C++ ultimately calls it int.

Carven analysis does not prove native constructibility. An earlier aggregate component retained across a later failure may need copying or moving into its final position. An immovable component may fail at C++ compilation; this does not prohibit every prvalue that can construct directly in its final position.

For example, an aggregate's first member comes from a native factory and its second may fail. The compiler completes and retains the first member before evaluating the second. Only after every component succeeds does the saved value enter the final aggregate. If the native type deletes the required copy and move constructors, that last step is invalid. A factory's ability to return an immovable value directly does not establish that this aggregate form works. Perform the whole construction inside a native adapter, or make the member type support the transfer that actually occurs.

## C strings

`c"text"` produces an external const char* to static immutable storage with trailing NUL. Empty strings are valid; interior NUL and `\0` are invalid. Even when passed directly to a template, it is a pointer rather than a character array. It is not str and does not participate in Carven constants or literal patterns; it retains external type and native conversions.

## Access and lifetimes

Unmarked arguments use Read, & uses Write, and && uses Take. A receiver inherits storage access. Initializing a local binding from a native reference result still creates an owning value, subject to C++ construction. Native members and indices inherit root access; native indexing follows provider bounds behavior.

Carven checks known owner availability, explicit conflicts, and known text backing. It does not infer C++ reference retention, pointer liveness, or iterator invalidation. Known callable borrows and Write captures cannot cross undeclared external contracts. Native reference bindings, pointer arithmetic, and external iteration protocols are unsupported.

Direct C++ calls can receive dynamic text views and aggregates containing them, protecting known backing through argument evaluation and the call. Providers and callers handle long-term retention, returned aliases, reentrancy, and indirect pointer lifetimes. A Write view slot does not prove release of its old backing borrow.

Results of native calls, construction, and representation conversions establish no new known borrow relationships, even when returning Carven types. String does not implicitly become a native string container.

## `#[cpp]`

Each top-level fragment enters the implementation unchanged and independently. It does not parse or interpolate Carven values or bind same-named Carven declarations. C++ contracts govern macros, overloads, templates, linking, exceptions, object lifetimes, ODR, and native undefined behavior.

## Explicit scalar boundaries

```carven
private import(cpp) fn native_value(value: i32) -> i32;

export(cpp) fn answer() -> i32 => 42;
```

import(cpp) is a private or bare declaration without a body, calling an unprefixed global C++ function of the same name. Carven neither generates the provider declaration nor parses and compares its signature. Authors and the toolchain supply definitions, matching, and linking. Same-named imports in different modules remain distinct Carven capabilities.

export(cpp) is a Carven function with a body, visible throughout the batch and included in the generated API. An import(cpp) cannot be exported directly; use an ordinary wrapper. Both directions require top-level functions with fixed argument counts, no failures, and by-value Read parameters. Write/Take and nonempty failure sets are unsupported.

| Carven         | C++                                      |
| -------------- | ---------------------------------------- |
| bool           | bool                                     |
| i8/i16/i32/i64 | std::int8_t/int16_t/int32_t/int64_t      |
| u8/u16/u32/u64 | std::uint8_t/uint16_t/uint32_t/uint64_t  |
| isize/usize    | std::ptrdiff_t/std::size_t               |
| f32/f64        | float/double                             |
| char           | char32_t, with inbound scalar validation |
| void           | Result only                              |

str, String, arrays, structs, enums, pointers, callables, entry arguments, and range views are outside this scalar boundary. Native capabilities obtained through direct header calls are a separate form from this closed interface.

Provider names cannot be main/std/carven. Authors are responsible for C++ leading-underscore reservation rules. Safe names retain their spelling in export APIs. Unsafe names and names beginning cv_escaped_ use that prefix followed by lowercase hexadecimal encoding of the original UTF-8 bytes. C++ keywords, double underscores, and underscore followed by uppercase are excluded. Function/namespace prefix conflicts are invalid.

## noexcept

Generated functions, closure calls, import bridges, and export façades are noexcept boundaries. Native operations need not themselves declare noexcept, but an exception escaping the boundary invokes std::terminate. Construction, members, operators, and lifetime operations follow the same rule. Carven try does not catch native exceptions.

To continue execution, catch exceptions first in an adapter in a header, native source, or cpp fragment, then return an application result through the chosen interface. A cpp fragment does not wrap the generated Carven function body.
