# Playground

The Playground runs the Carven compiler and Graver from one WASI module in a Web
Worker. Each invocation receives `main.cv` and the packaged Crafts library in an
in-memory filesystem. The worker returns diagnostics, output and generated files.
GitHub Pages serves the website and compiler assets as static files.

CodeMirror 6 owns editing and undo history. Its lexer supplies syntax highlighting;
the compiler supplies diagnostics.

## Build

CI shallow-checks out the compiler repository's latest default-branch commit into
`.deps/carven/`. It installs Xmake 3.1.1 and WASI SDK 34, then runs this
command from the website repository root:

```sh
.deps/carven/xmakew build
```

The checkout's `xmakew` applies the compiler repository's Clang module pipeline
patch. The root `xmake.lua` defines `carven-wasm` with C++26, Release mode, Xmake's
LTO policy and built-in `wasi` toolchain. The policy enables ThinLTO for Clang.
The `wasm` platform defaults to `wasm32`; SDK 34 targets WASI Preview 1. Xmake
manages module dependencies, compilation and linking.

For local builds, install the website dependencies and Xmake, extract WASI SDK 34
into `.deps/wasi-sdk/`, then prepare the checkout and SDK environment:

```sh
export WASI_SDK_PATH="$PWD/.deps/wasi-sdk"
git clone --depth 1 https://github.com/ryblust/carven.git .deps/carven
pnpm playground:build
```

`pnpm playground:build` runs the same wrapper command against the local checkout.
Xmake discovers the SDK through `WASI_SDK_PATH`, which CI's SDK setup action sets.
`src/playground/carven-wasm.cpp` provides the WASM entry point. Browser execution
and editor support live alongside it.

The target adds the SDK's `std.cppm` explicitly because Xmake 3.1.1's WASI toolchain
leaves the C++ runtime identity unspecified during standard-module discovery.
That module includes `<csignal>` and `<csetjmp>`; their WASI headers require
`_WASI_EMULATED_SIGNAL` and `-mexception-handling`, respectively. C++ exceptions
remain disabled through `set_exceptions("no-cxx")`.

Xmake links `carven.wasm` directly into `public/playground-assets/`. The target's
`after_build` hook bundles Crafts source into `crafts.json` and copies license
notices into that directory. The package includes an empty runtime header for the
compiler's library discovery; browser execution uses the interpreter, while
`compile` returns C++ source for a native build. The website build checks that the
WASM compiles, Crafts parses and license files exist. Generated assets, build
outputs and the compiler checkout are ignored by Git.

## Execution

| Action    | Result                                                         |
| --------- | -------------------------------------------------------------- |
| `check`   | Compiler diagnostics from source analysis                      |
| `run`     | Interpreter output, with a 100,000-step budget                 |
| `compile` | Generated C++ files, collected separately from stdout          |
| `tokens`  | Lexer token dump                                               |
| `ast`     | Parsed syntax-tree dump                                        |
| `format`  | Graver-formatted source from a successful, complete invocation |

Lexing, parsing and formatting operate at their source-syntax boundaries. Source
analysis resolves names and types; interpretation admits operations supported by
the interpreter. Native C++ calls produce an interpreter admission error.

Each request owns a worker, WASI instance and filesystem. Cancellation terminates
the worker. Only the current request can publish a result. Source replacement
requires a successful, complete formatting result.

Source and formatted output have a 64 KiB UTF-8 budget. Other stdout and stderr
share a 128 KiB budget; generated file writes have a separate 128 KiB budget.
Asset loading has a 120-second deadline and execution has a 30-second deadline.
The worker loads `carven.wasm` and `crafts.json` beneath the site's deployment
prefix. Downloads have a 128 MiB WASM budget and an 8 MiB Crafts budget. The module
imports WASI Preview 1 capabilities; WASI receives the packaged filesystem and
standard I/O.

## Validation

Tests assert current contracts using accepted inputs and expected errors. WASM
execution tests use the generated WASM and Crafts files.

| Boundary       | Contract                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assets         | Fixed resources resolve beneath the deployment prefix; packaged filesystem paths stay within Crafts; missing resources fail loading                              |
| WASI execution | Valid programs produce their results; invalid programs report diagnostics; budgets stop execution; generated files and formatted source follow publication rules |
| Worker session | Requests preserve source; completion releases the worker; cancellation and deadlines stop publication                                                            |
| Diagnostics    | Compiler byte locations map to editor selections; valid source locations support navigation                                                                      |

Run `pnpm test` against the generated package. For website changes, run
`pnpm format:check`, `pnpm build` and `pnpm check:links`. Build and check links with
the same deployment prefix.
