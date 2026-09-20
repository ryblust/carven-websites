---
title: "C++ names, operations, and boundaries"
description: "Headers, native types, source fragments, function contracts, exceptions, and returned borrows."
section: reference
lesson: 15
source: docs/semantics.md
---

## Headers and external names

```carven
import <vector> using std::vector;
import "provider.hpp" using vendor::{ Widget, create };
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

Fragments are implementation-only and publish no declarations to generated headers. Public native declarations belong in headers; public Carven entries use export(cpp). Fences do not isolate macros or pragmas and cannot configure headers already included. Use separate C++ files managed by the build for distinct native compilation environments.

## Declared function boundaries

```carven
private import(cpp) fn native_value(value: i32) -> i32;

export(cpp) fn answer() -> i32 => 42;
```

import(cpp) is a private or bare declaration without a body. It calls the same-named global C++ provider with the declared access; C++ resolves overloads and deduces templates from that call. Carven neither generates the provider declaration nor parses or compares its C++ signature. Declaration visibility, definitions, conformance, and linking belong to authors and the toolchain. Same-named imports in different modules remain distinct Carven capabilities.

export(cpp) is a Carven function with a body, visible throughout the batch and included in the generated API. An import(cpp) cannot be exported directly; use an ordinary wrapper. Both directions follow ordinary function type, access, visibility, ownership, and declared failure rules. void remains result-only; callable-view escape and public-surface visibility restrictions still apply.

| Carven contract                   | C++ representation                                                                |
| --------------------------------- | --------------------------------------------------------------------------------- |
| Scalars                           | Ordinary scalar representations; char uses char32_t                               |
| String / str                      | carven::runtime::String / std::string_view                                        |
| Arrays, slices, ranges, pointers  | Ordinary generated container, view, and pointer types                             |
| Structs, enums, concrete closures | Generated nominal types                                                           |
| Native types                      | Declared C++ type and its header environment                                      |
| Callable views                    | Runtime callable representation for the declared signature                        |
| Read                              | Ordinary Read policy: value snapshots or const references                         |
| Write                             | Mutable references                                                                |
| Take                              | Owned values; ordinary transfer for exports, native rvalue forwarding for imports |
| Infallible result                 | Ordinary result type, including void                                              |
| Declared failures                 | carven::runtime::Outcome<Result, Failures...>                                     |

Generated API headers include required generated type definitions, native header environments, and runtime support. Consumers use these headers and matching runtime headers as a C++ source interface. Internal test-stop transport is not added to exported failure sets: an escaping test stop terminates at the native entry, while declared failures remain observable Outcomes.

Native providers and callers own lifetime, retention, reentry, and value-validity obligations, including UTF-8 and Unicode scalar validity. Imported results establish no unknown backing relationship; native Write operations do not prove release of previous borrows. Declared callbacks may run during the call but cannot retain borrowed callable storage beyond its lifetime.

Direct infallible imported char results and exported Read/Take char parameters check Unicode scalar validity and terminate on invalid values. This is not recursive validation of aggregates, pointers, mutable references, or Outcomes.

Provider names cannot be main/std/carven. Authors are responsible for C++ leading-underscore reservation rules. Safe names retain their spelling in export APIs. Unsafe names and names beginning cv_escaped_ use that prefix followed by lowercase hexadecimal encoding of the original UTF-8 bytes. C++ keywords, double underscores, and underscore followed by uppercase are excluded. Function/namespace prefix conflicts are invalid.

## noexcept

Generated functions, closure calls, import bridges, and export façades are noexcept boundaries. Native operations need not themselves declare noexcept, but an exception escaping the boundary invokes std::terminate. Construction, members, operators, and lifetime operations follow the same rule. Carven try does not catch native exceptions.

To continue execution, catch exceptions first in an adapter in a header, native source, or cpp fragment, then return an application result through the chosen interface. A cpp fragment does not wrap the generated Carven function body.

A native adapter may explicitly return an Outcome matching a declared failure contract; C++ exceptions are never translated into Carven failures automatically.
