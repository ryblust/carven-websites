# Browser Playground

The Playground checks and interprets one `main.cv` entirely in a Web Worker. GitHub
Pages serves the website, compiler WASM, and packaged Crafts as static files. No
execution server, credentials, or user-code upload is involved. Native C++ calls
are outside the interpreter; generated C++ can still be inspected.

The single-file editor loads CodeMirror 6 on demand, with its own undo history,
indentation, selection, and line-number handling. Carven highlighting is a small
presentation lexer; compiler diagnostics remain authoritative. The editor is
independent of the execution worker, so a future language-service connection can
be added without changing the execution protocol. No LSP service is bundled yet.

## Build

Use Python 3 on Linux x86_64/arm64 or macOS arm64, alongside the website's Node
dependencies:

```sh
pnpm playground:build
pnpm build
pnpm test
pnpm check:links
```

Build concurrency is selected from the CPU count (up to eight workers). Use
`--jobs N` only when the build environment needs an explicit resource limit.

The compiler build downloads the pinned Carven source, WASI SDK 34, and LLVM
standard-module exports. Downloads are cached under `.site/playground-wasi-cache`.
Alternatively, `pnpm playground:build --compiler-repo ../carven` reads the exact
Git object from a local repository. It never reads uncommitted compiler changes
or modifies that repository's build state. The build uses temporary directories
and publishes generated assets under `public/playground-assets/`, which is ignored
by Git. `pnpm build` verifies the packaged asset sizes and hashes before
publishing. CI builds these assets before the website.

The website adapter supports `check`, `interpret`, `compile`, and Graver `format`. It excludes
native process launching. A narrow build overlay changes a `std::array` iterator
declaration from `const auto*` to `const auto` for the WASI libc++ ABI; it does not
change the language implementation. `llvm-module-lock.json` records the exact
LLVM revision and standard-module source hashes. Asset metadata records the
compiler baseline, toolchain, and overlay. Notices ship with the generated assets.

## Execution contract

- `run` invokes the actual Carven interpreter with a 100,000-step budget.
- `format` invokes Graver from the same pinned source revision and WASM module.
  It parses source syntax without requiring successful semantic analysis. Only a
  successful, complete result exposes `formattedSource`; diagnostics, cancellation,
  timeout, and truncated output leave the editor source intact. Formatting output
  uses the 64 KiB source budget. The asset manifest requires the Graver capability
  marker so older compiler packages are rejected before execution.
- Each request owns one worker, WASI instance, and in-memory filesystem. Editing,
  switching scenes, stopping, or leaving the page terminates the active worker.
- The host allows 120 seconds to load assets and 30 seconds to execute. The WASM
  memory maximum is 512 MiB. Source is limited to 64 KiB of UTF-8, captured output
  to 128 KiB, and generated files to a separate 128 KiB budget.
- Compiler files are downloaded from the site's deployment prefix and verified
  against the pinned manifest. WASI sees packaged Crafts and `main.cv`; it has no
  access to the user's disk or network.
- Generated C++ is read from the virtual output directory, independently of
  program stdout. Output is rendered as text.
- Drafts and the last selected scene stay in browser storage. Preset links use
  `#example=hello`, `structured-output`, `typed-failures`, `static-text`, or
  `specialization`; the URL does not contain user source.

Tests use the real packaged WASM for accepted programs, rejected programs,
interpreter admission, execution budgets, and generated artifacts. Client tests
cover worker ownership, cancellation, and rejection of malformed results. Browser
verification additionally covers editing, scene selection, language switching,
and actual static-host execution.

To update the compiler, change the explicit revision and download hash in
`build-wasi.py`, update `expectedCompilerRevision` in `src/playground/wasi.ts`,
check the portability overlay against the selected source, rebuild, and run the
contract checks. A moving compiler `HEAD` is never an automatic deployment input.
