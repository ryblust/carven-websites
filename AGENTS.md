# AGENTS.md

Carven's bilingual documentation website uses React, TanStack Start and Vite,
with a WASM compiler for the browser Playground.

## Documentation

- `src/playground/README.md`: compiler checkout, WASI SDK setup, build and execution.
- `docs/content-sync.md`: local content synchronization baseline and validation evidence (Git-ignored).
- `.github/workflows/pages.yml`: GitHub Pages build and deployment.

## Build and validation

Use pnpm and the scripts in `package.json`. Website builds and Playground
execution tests require generated compiler assets.

```shell
pnpm install
pnpm dev
pnpm playground:build
pnpm format:check
pnpm build
pnpm test
pnpm check:links
```
