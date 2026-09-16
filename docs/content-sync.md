# Compiler content alignment

Last reviewed compiler revision: `69e13f4ae553ec20ab016bd36771cff1101314bf` (2026-09-16).

## Reviewed changes

- `0c066a51`: mixed builtin formatting uses direct writer operations. Existing formatting Reference and C++ generation explanations cover retained operand evaluation, dynamic text observations, and capacity bounds.
- `7c648721`: generated storage mutability follows retained access. Existing C++ generation explanations cover projection access and mutable owner requirements.
- `69e13f4a`: integer range values and patterns. Updated both locales' control-flow and constant-execution lessons, type/control/constant/lexical Reference, complete grammar productions, diagnostic catalog, and syntax highlighting. The design philosophy now makes the boundary between source analysis and native optimization explicit.

Evidence: compiler documentation in `docs/semantics.md`, `docs/grammar.md`, `docs/tutorial.md`, `docs/compiler.md`, and `docs/backend.md`; range expression analysis, pattern analysis, coverage analysis, and `crafts/carven/runtime/range.hpp`; language range-value and range-pattern tests.

## Validation

The compiler was built with `./xmakew build`, then cleaned and rebuilt to verify the interpreter issue below. No compiler source files were changed.

- All 31 EBNF blocks match the compiler grammar in both locales.
- Updated bilingual example blocks match exactly.
- 25 of 26 native/interpreter/C++ example checks pass, including five classification boundaries, compile-time summation, range snapshots, closed iteration through the integer maximum, and expected rejection of incomplete static and dynamic matches.
- Website build, type checking, all 36 website tests, formatting, and local link checks pass.
- Root and `/carven-websites` builds pass link checks across 93 pages and 8,000 local links/assets. Authored Markdown URLs receive the deployment base in static HTML as well as client navigation.
- Bilingual desktop and mobile reading layouts were inspected. Chapter filtering, navigation, Escape dismissal, focus return, and scroll restoration were checked on the production subpath build.
- Extracted chapter navigation and mobile dialog components, consolidated mobile navigation styles, and removed unused font assets. Native HTML navigation and the unhydrated chapter disclosure remain available.

## Open compiler issue: range classification in the interpreter

This remains reproducible after `./xmakew clean` and `./xmakew build` at the revision above. Native execution prints `pass`; interpreter execution terminates with an invariant violation.

Save as `main.cv`:

```carven
fn main() {
    let score = 85;
    let label = match score {
        ..0 => "invalid",
        0..60 => "retry",
        60..=100 => "pass",
        101.. => "invalid",
    };
    println(label);
}
```

Reproduce with `carven interpret main.cv`:

```text
carven: invariant violation: execution requested a builtin type absent from the semantic program
  at src/semantic/semir/constant_access.cpp:46:9
```

The public workflow lesson records this limitation and directs readers to native execution for this example. Remove that note after verifying a compiler fix. The exact root cause has not been established in this website-only change.
