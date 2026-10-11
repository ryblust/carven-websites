# Playground

The Playground runs the Carven compiler and Graver as a WASI module in a Web
Worker. CodeMirror 6 handles editing and syntax highlighting. GitHub Pages serves
the website and compiler assets.

## Build

CI checks out the compiler repository's latest default-branch commit into
`.deps/carven/` and builds it with Xmake 3.1.1 and WASI SDK 34. For a local build,
extract the SDK into `.deps/wasi-sdk/`, then run from the website repository root:

```sh
pnpm install
git clone --depth 1 https://github.com/ryblust/carven.git .deps/carven
export WASI_SDK_PATH="$PWD/.deps/wasi-sdk"
pnpm playground:build
```

`pnpm playground:build` invokes `.deps/carven/xmakew build` with the website's
`xmake.lua`. The target uses C++26, Release mode and ThinLTO. Its WASI standard-module
configuration is documented beside the target in `xmake.lua`.

Build outputs go to `public/playground-assets/`: `carven.wasm`, `crafts.json`,
and license notices. Website builds validate these assets before generating pages.

Local content synchronization baselines and validation evidence are recorded in
`docs/content-sync.md`.

## Execution

Each invocation receives `main.cv` and the packaged Crafts library in an in-memory
filesystem. `carven-wasm.cpp` provides the compiler entry point; `wasi.ts` handles
asset loading and filesystem access; `client.ts` manages worker sessions.

| Action    | Result                              |
| --------- | ----------------------------------- |
| `check`   | Diagnostics and compile-time output |
| `run`     | Interpreter output                  |
| `compile` | Generated C++ files                 |
| `tokens`  | Lexer token dump                    |
| `ast`     | Parsed syntax-tree dump             |
| `format`  | Formatted source                    |

Native C++ calls produce an interpreter admission error. Generated C++ can be
built with a native toolchain.

Diagnostics includes captured standard output. Output shows stdout from Check,
Run or Generate C++; syntax dumps and formatted source use their respective views.

Each request owns a worker, WASI instance and filesystem. Cancellation terminates
the worker, and only the current request publishes results. Formatting replaces
source after a successful, complete result. Resource limits and deadlines are
defined in `carven-wasm.cpp`, `wasi.ts` and `client.ts`.

## Validation

Build the compiler assets before running `pnpm test`. WASI execution tests and
page interaction tests execute the packaged compiler. Page tests use jsdom with
a worker transport adapter; layout, focus and browser workers are checked in the
browser.
