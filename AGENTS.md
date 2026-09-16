# Carven website

This repository owns the static Carven website. Website work stays local and does not require changing or building the neighboring compiler. Publish only when requested.

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

- Marketing demonstrates current capabilities, tutorials teach a sequence, and Reference states rules and boundaries. Write concise, neutral explanations. Verify language claims against the current compiler source and documentation; website tests do not validate Carven semantics.
- Chinese and English share layouts and interactions. Locale comes from the URL; preserve corresponding articles, metadata and accessible labels.
- Use platform system fonts for the Carven wordmark, homepage name and other text, Allura for the homepage tagline, and system monospace for code. Keep the dark palette and restrained surface depth. Keep prose, comments and controls readable, with visible keyboard focus and reduced-motion support.
- Examples use deliberate line breaks and four-space indentation. Switching homepage examples preserves their content width and left/top origin; narrow screens allow horizontal code scrolling.

## Completion

Finish the requested change and resolve regressions it introduces. Choose checks for the affected behavior:

- Guidance edits: check formatting and referenced paths. No application build is needed.
- Authored content or highlighting: generate/build and check links; use focused tests for rendering or validation changes.
- Visual changes: inspect affected pages at desktop and narrow widths, including both locales. Check changed controls with the keyboard.
- Pipeline, routing or dependency changes: build, run website tests and check links. Changes to URLs or asset paths also need a non-root `BASE_PATH` build and link check, followed by restoration of the normal local build.

`./sitew format:check` checks authored formatting; `./sitew test` runs website tests; `./sitew check:links` checks the built static output. Use `@effect/vitest` and TestClock for Effect behavior and timing. Repeat checks when subsequent changes affect them. Report what was verified and any remaining limitations.
