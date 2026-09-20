# Compiler content alignment

This log records which compiler behavior the website describes and the evidence used to align it. It is a maintenance record, not a release announcement or a copy of the language specification.

## Current baseline

| Field                  | Value                                                                             |
| ---------------------- | --------------------------------------------------------------------------------- |
| Reviewed compiler      | `65b142e0709dc725fb5377a05065f2932a17f7dc`                                        |
| Review date            | 2026-09-20                                                                        |
| Website starting point | `6a50b4c`                                                                         |
| Scope                  | English and Chinese authored content, homepage snippets, grammar, and diagnostics |
| Status                 | Content reviewed; website builds, tests, links, and browser checks passed         |

The revision identifies the local compiler checkout, not a packaged release or the deployed website. Validation applies only to the entry that records it.

## Update rules

1. Record the exact compiler revision before reviewing its changes. Compare with the previous baseline and inspect final source, documentation, and relevant fixtures; commit titles alone do not establish behavior.
2. Classify each user-visible change as a correction, an addition, already covered, or not relevant to the website. Track unresolved items explicitly instead of implying complete coverage.
3. Update matching English and Chinese pages together. Tutorials introduce a task, runnable steps, expected results, and a small next exercise. Reference states accepted forms, requirements, evaluation order, and failure boundaries. Marketing demonstrates supported capabilities without turning into a change log.
4. Update authored files in `src/content/`, including homepage snippets. Keep formal grammar and diagnostic entries aligned with their compiler sources. Do not edit generated article bodies.
5. Record checks actually performed, their scope, and any skipped checks. Static review, website builds, browser inspection, and compiler execution are distinct evidence. User-requested omissions remain visible in the record.
6. Advance the baseline after the content pass and document any remaining gaps. Keep dated entries newest first; do not carry earlier passing results into a new entry. Publishing remains a separate action.

## Editorial responsibilities

| Content               | Reader's question                                 | Include                                                                                                         | Leave elsewhere                                                                      |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Tutorial              | How do I complete this task?                      | A named file or explicit earlier context, one new idea, commands, expected results, and a focused exercise      | Exhaustive type matrices, all flags, diagnostic catalogs, and implementation details |
| Reference             | What exactly is allowed, required, or observable? | Syntax, preconditions, ordering, supported boundaries, failure behavior, and small examples that clarify a rule | A project walkthrough or an assumed lesson sequence                                  |
| Feature/use-case page | What capability is useful here?                   | A concrete supported use and its relevant limits                                                                | A second tutorial or a promise beyond current behavior                               |
| Sync record           | What changed, and how was it checked?             | Exact revision, affected pages, evidence, review findings, and validation scope                                 | Language rules already documented in Reference or unqualified historical test claims |

A tutorial links to Reference when a learner needs the full contract. Reference links to a tutorial for a complete exercise. Distinguish a language rule from CLI source collection, generated C++ behavior, and native-provider responsibilities. Translated examples should preserve code and observable results; prose may use natural wording for each language.

Compiler paths below are relative to the sibling `carven` checkout; website paths are relative to this repository.

## 2026-09-20 — commands, construction, and native contracts

### Content changes

| Compiler changes                                                       | Website action                                                                                                                               | Evidence in compiler                                                                                                                                |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `7d9853ef`: shared source collection and runtime test commands         | Correct CLI, modules, toolchain, and workflow; teach direct test execution and retain main in the project exercise                           | `docs/cli.md`, `src/driver/sources.cpp`, `src/driver/interpret.cpp`, `tests/cli/commands/source_collection/`, `tests/cli/commands/execution_modes/` |
| `7d9853ef`: ordinary C++ function contracts                            | Replace scalar-only restrictions, document access/failure representations and provider obligations, add an exported mutation/failure example | `docs/semantics.md`, `src/semantic/analysis/interop/interop.cpp`, `tests/interop/providers/contracts.cv`                                            |
| `b9085548`, `6347325b`: default initialization and String construction | Explain whole-value defaults and complete nonempty construction; replace String::new in both locales and homepage                            | `docs/semantics.md`, `tests/language/types/default_initialization.cv`, `tests/cli/commands/default_initialization/`                                 |
| `b9085548`: constant blocks                                            | Add a tutorial preparation example, Reference execution rules, feature explanation, and formal grammar productions                           | `docs/semantics.md`, `docs/grammar.md`, `tests/cli/commands/constant_blocks/`                                                                       |
| `4c6b6020`: structural display and assertion explanations              | Teach direct record printing and failed-comparison inspection; document display limits and evaluation preservation                           | `docs/semantics.md`, `tests/cli/commands/structural_display/`, `tests/interop/runtime_headers/display.cpp`                                          |
| `4c12d406`, `b9085548`, `6347325b`: checking, timing, combined dump    | Add commands and specify entry requirements, output streams, and test-entry selection                                                        | `docs/cli.md`, `src/driver/cli.cpp`, `tests/cli/invocation/help/`                                                                                   |
| `16da9b3e`: staged execution                                           | Retain previously updated floating/failure guidance; add missing numeric context rules for integer range bounds                              | `docs/semantics.md`, existing bilingual constants and failures articles                                                                             |
| Current grammar and diagnostic registry                                | Synchronize both formal grammar sets and diagnostic tables; remove obsolete C++ boundary codes and add default-initialization diagnostic     | `docs/grammar.md`, `src/diagnostics/code.cpp`                                                                                                       |
| `65b142e0`: Clang module scan inputs                                   | Reviewed; no website language or command changes needed                                                                                      | `xmake/clang-module-pipeline/README.md`, versioned Xmake patch                                                                                      |

### Review findings

A second agent independently reviewed the changed lessons and Reference against the compiler documentation and fixtures. The joint review corrected these boundaries:

- Default-value tables describe a type operation; they do not introduce array or slice construction syntax.
- Independent step budgets apply to interpreted runtime tests, not native test execution.
- Fixed Crafts collection is CLI policy, while language analysis operates on the assembled closed batch.
- Interpreted runtime tests do not validate generated C++ or native linking.
- The interop lesson now checks successful mutation and failure preserving the original text before introducing the generated interface. Exhaustive type representations remain in Reference.

The follow-up review found no remaining substantive issues in the edited examples or their bilingual explanations.

### Validation and limits

- All 31 formal grammar blocks and 141 diagnostic code/severity/description entries match the reviewed compiler sources in both locales. Changed bilingual examples preserve code and results apart from translated comments.
- Root and `/carven-websites` production builds pass generation and TypeScript checking. Both builds pass checks of 93 pages and 8,377 local links/assets, including fragment anchors. The normal root build is restored for local use.
- All 36 website tests across 10 files pass. Repository formatting and `git diff --check` pass.
- Browser review covered the interop lesson and Reference in both locales, desktop and narrow layouts, locale switching, the narrow contents disclosure, section navigation, code overflow, and the contract table.
- Preview processes were stopped. The old Vite/Vitest cache was removed; production builds replace old output and content generation prunes removed article artifacts. Existing public images, favicons, font, and font license remain in use; none were removed as obsolete.
- Compiler builds, compiler tests, and execution of Carven examples were not performed. Language claims and examples were reviewed against source documentation and fixtures; website checks do not establish compiler execution correctness. The compiler checkout has unrelated uncommitted work and was not changed by this website update.
- Publication uses the existing GitHub Pages workflow from `main`; the workflow run identifies the deployed website commit. The earlier request to skip builds was superseded by the final review-and-deploy request.

## 2026-09-16 — historical record

Recorded compiler revision: `191300ba9161a0191f3720a6b8fec65bad411c88`.

The previous agent's record is retained below. Its validation describes that historical state, not the current baseline. Website commit `9333870` on September 18 subsequently updated some staged-execution guidance without advancing this log; the September 20 review accounts for that content.

### Reviewed changes

- `191300ba`: builtin types are established before analysis and queried through the same read-only contract during construction and after publication. Updated both locales to describe interpretation as an experimental teaching subset and removed the resolved range-classification warning.
- `0c066a51`: mixed builtin formatting uses direct writer operations. Existing formatting Reference and C++ generation explanations cover retained operand evaluation, dynamic text observations, and capacity bounds.
- `7c648721`: generated storage mutability follows retained access. Existing C++ generation explanations cover projection access and mutable owner requirements.
- `69e13f4a`: integer range values and patterns. Updated both locales' control-flow and constant-execution lessons, type/control/constant/lexical Reference, complete grammar productions, diagnostic catalog, and syntax highlighting. The design philosophy now makes the boundary between source analysis and native optimization explicit.

Evidence: compiler documentation in `docs/semantics.md`, `docs/grammar.md`, `docs/tutorial.md`, `docs/compiler.md`, and `docs/backend.md`; range expression analysis, pattern analysis, coverage analysis, and `crafts/carven/runtime/range.hpp`; language range-value and range-pattern tests.

### Historical validation

The local compiler was rebuilt after making builtin-type queries read-only and establishing the complete builtin domain before analysis. Validation uses the local compiler commit above; it does not identify a packaged release.

- All 31 EBNF blocks match the compiler grammar in both locales.
- Updated bilingual example blocks match exactly.
- The previous example audit passed 25 of 26 checks. The remaining integer-classification example now prints `pass` in both interpreted and native execution.
- Compiler validation passes all 113 test tasks and clang-tidy across 847 files. Added contract tests cover builtin identity across publication, static and dynamic range selection, and execution without modifying published type or constant stores.
- Website build, type checking, all 36 website tests, formatting, and local link checks pass.
- Root and `/carven-websites` builds pass link checks across 93 pages and 8,000 local links/assets. Authored Markdown URLs receive the deployment base in static HTML as well as client navigation.
- Bilingual desktop and mobile reading layouts were inspected. Chapter filtering, navigation, Escape dismissal, focus return, and scroll restoration were checked on the production subpath build.
- Extracted chapter navigation and mobile dialog components, consolidated mobile navigation styles, and removed unused font assets. Native HTML navigation and the unhydrated chapter disclosure remain available.
