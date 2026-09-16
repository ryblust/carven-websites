# Compiler content alignment

Last reviewed compiler revision: `191300ba9161a0191f3720a6b8fec65bad411c88` (2026-09-16).

## Reviewed changes

- `191300ba`: builtin types are established before analysis and queried through the same read-only contract during construction and after publication. Updated both locales to describe interpretation as an experimental teaching subset and removed the resolved range-classification warning.
- `0c066a51`: mixed builtin formatting uses direct writer operations. Existing formatting Reference and C++ generation explanations cover retained operand evaluation, dynamic text observations, and capacity bounds.
- `7c648721`: generated storage mutability follows retained access. Existing C++ generation explanations cover projection access and mutable owner requirements.
- `69e13f4a`: integer range values and patterns. Updated both locales' control-flow and constant-execution lessons, type/control/constant/lexical Reference, complete grammar productions, diagnostic catalog, and syntax highlighting. The design philosophy now makes the boundary between source analysis and native optimization explicit.

Evidence: compiler documentation in `docs/semantics.md`, `docs/grammar.md`, `docs/tutorial.md`, `docs/compiler.md`, and `docs/backend.md`; range expression analysis, pattern analysis, coverage analysis, and `crafts/carven/runtime/range.hpp`; language range-value and range-pattern tests.

## Validation

The local compiler was rebuilt after making builtin-type queries read-only and establishing the complete builtin domain before analysis. Validation uses the local compiler commit above; it does not identify a packaged release.

- All 31 EBNF blocks match the compiler grammar in both locales.
- Updated bilingual example blocks match exactly.
- The previous example audit passed 25 of 26 checks. The remaining integer-classification example now prints `pass` in both interpreted and native execution.
- Compiler validation passes all 113 test tasks and clang-tidy across 847 files. Added contract tests cover builtin identity across publication, static and dynamic range selection, and execution without modifying published type or constant stores.
- Website build, type checking, all 36 website tests, formatting, and local link checks pass.
- Root and `/carven-websites` builds pass link checks across 93 pages and 8,000 local links/assets. Authored Markdown URLs receive the deployment base in static HTML as well as client navigation.
- Bilingual desktop and mobile reading layouts were inspected. Chapter filtering, navigation, Escape dismissal, focus return, and scroll restoration were checked on the production subpath build.
- Extracted chapter navigation and mobile dialog components, consolidated mobile navigation styles, and removed unused font assets. Native HTML navigation and the unhydrated chapter disclosure remain available.
