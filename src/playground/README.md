# Playground

The Playground runs the Carven compiler and formatter as a WASI reactor in a Web
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

`pnpm sync` fetches the exact compiler commit in `carven-version.json` into `.deps/carven/`, then
builds the Playground, builds the website, runs tests, and checks generated links.
It stops on failure. Local changes in `.deps/carven/` stop synchronization.
The current baseline is Carven 0.1.0 at
`5b10565902fa0a8b614e0c0238311cbf044d8da6`. This command updates compiler assets;
review and update the authored English and Chinese articles separately.

To use a local compiler checkout without fetching:

```sh
CARVEN_SOURCE_DIR=../carven pnpm sync
```

`CARVEN_SOURCE_DIR` uses that checkout as it is, including uncommitted changes,
without fetching or switching commits. Keep it set when building or previewing
assets from a local revision that differs from the pinned commit.

For a compiler release update, change the version and full commit in `carven-version.json`,
review the English and Chinese content against that commit, then run `pnpm sync`.
Default builds require assets from the pinned commit.

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
uploads the website output for deployment. Native release archives cannot replace
this WASI build; the 0.1.0 release does not include a browser compiler.

Outputs in `public/playground-assets/` include `carven.wasm`, `crafts.json`,
`compiler-revision.txt`, and license notices. `crafts.json` contains the standard
library's `.cv` sources and is regenerated after each Playground build. Website
builds validate these assets. The footer displays the packaged compiler revision;
`-dirty` identifies a checkout with local changes.
Browser asset requests include that revision to avoid reusing a previous
release's cached compiler or Crafts.

Record local synchronization baselines and validation evidence in the Git-ignored
`content-sync.md` at the repository root.

## Execution

Each invocation receives the project files, standard input, and packaged Crafts
library in an in-memory filesystem. `main.cv` is the program entry. The editor can
switch between Carven sources and text data files. Test analyzes every supplied
Carven source as an explicit root, so tests in helper files run too. `carven-wasm.cpp` provides the compiler entry point; `wasi.ts` handles
asset loading and filesystem access; `client.ts` manages worker sessions.

| Action    | Result                              |
| --------- | ----------------------------------- |
| `check`   | Diagnostics and compile-time output |
| `run`     | Interpreter output                  |
| `test`    | Runtime and async test results      |
| `compile` | Generated C++ files                 |
| `tokens`  | Lexer token dump                    |
| `ast`     | Parsed syntax-tree dump             |
| `format`  | Formatted source                    |
| `call`    | A hosted function return value      |

Choose the Tests result view to run ordinary `test` and `async test` blocks.
The async-tests preset opens that view automatically. Static tests run during
analysis; runtime tests run sequentially with separate execution budgets and
skip the program entry. The result includes test output, diagnostics, and the
pass/fail summary. A failed test returns a nonzero exit status.

The presets include TOML-driven request summaries with hash collections,
captured pricing policies, a bounded producer/consumer channel, a virtual-file
release report, and async test suites. Older preset links remain available.
Native project builds use the local toolchain; follow the project-build link
beside the editor for multi-file build, run, and test commands.

The interpreter runs supported Carven source, including closures, async
composition, JSON, TOML, collections, channels, and SIMD. Standard input comes from
the input panel and reaches EOF when consumed; clocks and timers use the WASI host. The browser registers portable native
bindings for collections, channels, the virtual filesystem, and output. Files are
isolated to the invocation's memory; output uses an immediate browser sink. The
Files result view appears for file-producing presets or actual user artifacts;
the hosting bridge's internal result file does not enable it. It opens new or
modified text files, including reports written outside the compiler's generated-C++
directory. Results stay in memory and never enter saved drafts. Only an explicit
Download click creates a local download. Input files are restored on each run.
The browser cannot launch processes, call arbitrary native C++, or use TCP
providers. Use the local toolchain and the host bindings those programs require.
Use Generate C++ to export source for a native toolchain. Generation uses
`--no-query` because Craft build queries require a child process; its manifest
does not contain queried native build settings.

The pricing-preview preset keeps one `HostSession` alive in a dedicated worker
and WASM instance. `hosting.cpp` links the public SDK adapters from the pinned
compiler, excluding the native standard-provider bundle. Initial loading selects
a bare `quote` entry. Opening the preview computes its first quote automatically.
Amount and discount edits update live through the already analyzed program.
A 40 ms input window coalesces queued changes; running calls finish without
worker termination, and only the latest parameters may publish their result.
These background calls retain the action button, provenance label, and status
footer; only the quote values change. Source changes get their own pending label.
Parameter edits use the accepted source snapshot even when the editor has
unapplied changes. Update preview explicitly applies source edits, checking every
project source and the selected entry before
`HostSession::reload` publishes the replacement. A rejected source update leaves
the previous program active, so subsequent inputs compute fresh results with
that implementation. The preview shows the active revision and reload diagnostics.
Failed candidates are remembered until their source changes.

The reactor exports `carven_execute` and `carven_close`. Commands travel through
a reserved in-memory file; initialization runs once per instance. Each hosted
call retains its own execution budget and result. This preview admits i32
arguments and renders the returned record; it does not execute the program entry
or runtime tests. The same `pricing.cv` runs through Test alongside `main.cv` in
an isolated worker. A busy cancellation or timeout discards that worker; the next
host worker can restore the last accepted source before checking a new candidate.
Project reset, example switch, and navigation close the session and discard that
checkpoint. Asynchronous browser service bridges are not implemented.

Each example is an independent project with its own complete file inventory and
draft. Switching examples replaces the current project; it does not append files.
`main.cv` remains the fixed program entry. Adding a file prefills a unique
`helper.cv`, `helper2.cv`, and so on, ready to add without typing. File paths are
relative to the project root. The optional file tree derives folders from these
paths; tabs and the tree select files from that same inventory.

The workspace accepts up to 16 files, 256 KiB of combined text, and 64 KiB of
standard input. Entry source keeps its 64 KiB limit. File paths are relative and
cannot replace packaged Crafts or reserved compiler paths. Drafts include all
project files and input, and belong to the exact preset version they came from. Reset removes that
project's draft instead of storing its default content again.

The Diagnostics view includes captured standard output. Output shows stdout from Check,
Run or Generate C++; syntax dumps and formatted source use their respective views.

Ordinary compiler actions own separate workers, WASI instances, and filesystems;
hosted calls reuse their dedicated instance. Cancellation terminates a busy
worker, and only the current request publishes results. The execution session
keeps the validated compiler module and Crafts in memory after the first load.
Later workers receive these assets through structured cloning, so they can reuse
compiled code while keeping mutable runtime state separate. Formatting replaces
source after a successful, complete result. Resource limits and deadlines are
defined in `carven-wasm.cpp`, `wasi.ts` and `client.ts`.

Article code blocks use the same execution session through
`effects/code-execution.ts`. Mark a complete, standalone example with `carven run`
or `cv run` in its code fence to show Run. Verify the example with the packaged
browser interpreter and check that its output matches the surrounding lesson.
Leave fragments, multi-file programs, native calls, input-dependent examples, and
intentional errors unmarked. The displayed source is executed without adding
hidden context.

Run loads the client on demand and displays output and diagnostics below the
source. Stop, another run, or article navigation cancels the active worker.

The source editor keeps a stable scrollbar gutter. Native scrollbar appearance
comes from `styles/scrollbars.css`, shared with home examples, documentation,
navigation, and search. The site installs one passive capture listener from
`lib/scrollbars.ts`; nested scrollers reveal their thumb while hovered or for
800 ms after scrolling. Scroll feedback updates DOM attributes without React
renders. Page scrollbars retain a quiet position marker, and forced-colors mode
keeps system colors. Layouts retain their existing overflow and gutter choices.

## Validation

Build the compiler assets before running `pnpm test`. WASI execution tests and
page interaction tests execute the packaged compiler. Page tests use jsdom with
a worker transport adapter; layout, focus and browser workers are checked in the
browser.
