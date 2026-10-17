# Playground

The Playground runs the Carven compiler and formatter as a WASI module in a Web
Worker. CodeMirror 6 handles editing and syntax highlighting. GitHub Pages serves
the website and compiler assets.

## Build

Use Node.js 26 or later and the pnpm version in `package.json`. Extract WASI SDK 34
into `.deps/wasi-sdk/`, then run from the website repository root:

```sh
pnpm install
pnpm sync
pnpm preview
```

`pnpm sync` fetches the compiler's latest remote `main` into `.deps/carven/`, then
builds the Playground, builds the website, runs tests, and checks generated links.
It stops on failure. Local changes in `.deps/carven/` stop synchronization.

To use a local compiler checkout without fetching:

```sh
CARVEN_SOURCE_DIR=../carven pnpm sync
```

Set `WASI_SDK_PATH` to use an SDK installed elsewhere. For website-only development,
run `pnpm dev` with the existing compiler assets. Restart `pnpm preview` after a
new production build.

To build only the Playground from the existing compiler checkout:

```sh
pnpm playground:build
```

This uses `.deps/carven/` and `.deps/wasi-sdk/` by default. `CARVEN_SOURCE_DIR` and
`WASI_SDK_PATH` select other locations. The command uses the selected compiler's
wrapper without fetching source.

The compiler wrapper builds the website's `xmake.lua` target with C++26, Release
mode and ThinLTO. CI installs Xmake 3.1.1 and WASI SDK 34, runs `pnpm sync`, and
uploads the website output for deployment.

Outputs in `public/playground-assets/` include `carven.wasm`, `crafts.json`,
`compiler-revision.txt`, and license notices. `crafts.json` contains the standard
library's `.cv` sources and is regenerated after each Playground build. Website
builds validate these assets. The footer displays the packaged compiler revision;
`-dirty` identifies a checkout with local changes.

Record local synchronization baselines and validation evidence in the Git-ignored
`content-sync.md` at the repository root.

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

The interpreter runs supported Carven source, including async composition, JSON,
and SIMD. Standard input is empty; clocks and timers use the WASI host. Native
C++ calls and TCP providers require a native build. Use Generate C++ to export
source for a native toolchain.

Diagnostics includes captured standard output. Output shows stdout from Check,
Run or Generate C++; syntax dumps and formatted source use their respective views.

Each request owns a worker, WASI instance and filesystem. Cancellation terminates
the worker, and only the current request publishes results. The execution session
keeps the validated compiler module and Crafts in memory after the first load.
Later workers receive these assets through structured cloning, so they can reuse
compiled code while keeping mutable runtime state separate. Formatting replaces
source after a successful, complete result. Resource limits and deadlines are
defined in `carven-wasm.cpp`, `wasi.ts` and `client.ts`.

## Validation

Build the compiler assets before running `pnpm test`. WASI execution tests and
page interaction tests execute the packaged compiler. Page tests use jsdom with
a worker transport adapter; layout, focus and browser workers are checked in the
browser.
