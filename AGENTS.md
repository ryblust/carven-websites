# Carven website

This repository owns the static Carven website. Website work stays local unless publication is requested. Do not change the neighboring compiler as part of website work. Building or using it to validate language examples is appropriate when needed; avoid unrelated compiler work.

## Toolchain

Use `./sitew` for the project-local commands. `build` generates content, builds with Vite and checks types with TypeScript 7; the deliverable is `dist/client/`. Manage the preview with `dev`, `status` and `stop`.

For dependency or framework changes, use `package.json`, the lockfile and the relevant configuration as the version baseline. [docs/frameworks.md](docs/frameworks.md) maps specific tasks to installed library guidance; read the applicable entry. Effect packages share the pinned 4.x RC version, and Vitest must satisfy their peer requirements.

## Implementation boundaries

- Routes own metadata and imports of individual article bodies; views compose pages. `Site` owns shared navigation and footer; `Article` owns the reading layout. Use typed Router links and the shared base-path helper for asset URLs.
- Author articles and homepage snippets in `src/content/`. `scripts/content/` generates `src/generated/`; change the source rather than generated files or `src/routeTree.gen.ts`. The manifest contains metadata and navigation, while each article body remains a separate import.
- Reading and ordinary navigation work from static HTML. Markdown and Shiki run at build time; the homepage and articles share the Carven grammar and Vesper theme. Keep these build dependencies out of browser modules.
- The content pipeline uses Effect for I/O, expected failures and resource ownership, with Schema at authoring boundaries. `ContentRepository` owns files, `Markdown` owns the scoped highlighter, and `generateContent` composes them. Reuse these boundaries; ordinary data transformations and React state do not need service wrappers.
- Article DOM enhancements belong to `ArticleBody` and its effects. Handle user actions in event handlers; use React effects for lifecycle synchronization and subscriptions. Shared Effect runtimes and listeners must be released on navigation or server shutdown; expected cancellation stays silent and unexpected failures remain visible.

## Content and design

- Marketing demonstrates current capabilities. Tutorials teach a task through complete examples, commands, expected results, and a focused exercise; introduce one new idea at a time and mark fragments that depend on earlier code. Reference defines accepted forms, requirements, evaluation order, and failure boundaries with small illustrative examples. Link to the canonical rule instead of duplicating a contract table in a lesson. Keep language semantics, CLI policy, and native-provider obligations distinct.
- Homepage copy leads with concrete benefits and a few credible reasons to adopt Carven. Choose natural tasks that demonstrate one main capability each; do not try to cover the language or turn the homepage into a reference. Tutorials explain the work, and Reference states the rules. Keep all claims precise and avoid hype.
- Handwritten C++ comparisons use reasonable, idiomatic implementations under the same task requirements. Explain requirements that account for extra code, identify omitted setup and distinguish comparisons from compiler output. Do not inflate C++ boilerplate or imply that alternative libraries and representations do not exist.
- Verify language claims against the current compiler source and documentation. Run new or substantially changed examples with an available, up-to-date compiler, including stated results or failure cases; identify the compiler revision and relevant working-tree changes. If execution is unavailable, report that limitation. Website builds and tests do not validate Carven semantics.
- Chinese and English share layouts and interactions. Locale comes from the URL; preserve corresponding articles, metadata and accessible labels.
- Use platform system fonts for the Carven wordmark, homepage name and other text, Allura for the homepage tagline, and system monospace for code. Keep the dark palette and restrained surface depth. Keep prose, comments and controls readable, with visible keyboard focus and reduced-motion support.
- Examples use deliberate line breaks and four-space indentation. Keep code width and left/top alignment stable when switching homepage examples. Equal heights are not required: avoid clipping short examples or leaving large empty areas solely for uniformity. Narrow screens allow horizontal code scrolling.

## Content alignment

For compiler-driven content updates, follow [docs/content-sync.md](docs/content-sync.md). Record the exact reviewed compiler revision, user-visible changes and source evidence, bilingual coverage, and validation actually performed. Keep tutorial steps and Reference rules distinct. Historical checks are not evidence for the current revision; record skipped checks and unresolved gaps explicitly.

## Completion

Finish the requested change and resolve regressions it introduces. Choose checks for the affected behavior:

- Guidance edits: check formatting and referenced paths. No application build is needed.
- Authored content or highlighting: generate/build and check links; use focused tests for rendering or validation changes.
- Visual changes: inspect affected pages at desktop and narrow widths, including both locales. Check changed controls with the keyboard.
- Pipeline, routing or dependency changes: build, run website tests and check links. Changes to URLs or asset paths also need a non-root `BASE_PATH` build and link check, followed by restoration of the normal local build.

`./sitew format:check` checks authored formatting; `./sitew test` runs website tests; `./sitew check:links` checks the built static output. Use `@effect/vitest` and TestClock for Effect behavior and timing. Repeat checks when subsequent changes affect them. Report what was verified and any remaining limitations.
