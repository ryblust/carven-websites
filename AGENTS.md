# AGENTS.md

Carven's bilingual documentation website uses React, TanStack Start and Vite,
with a WASM compiler for the browser Playground.

## Documentation

- `src/playground/README.md`: compiler checkout, WASI SDK setup, build and execution.
- `content-sync.md`: local content synchronization baseline and validation evidence.
- `.github/workflows/pages.yml`: GitHub Pages build and deployment.

## Documentation style

Use [ASD-STE100 writing principles](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf)
as editorial guidance. Explain the task before introducing its syntax or technical terms.
Give instructions as direct actions, with prerequisites first. Develop explanations
gradually, with one topic per paragraph. Use consistent terms and keep API names exact.
Review the English text first, then adapt the Chinese text for natural reading.
Preserve technical meaning when shortening sentences. Use human review rather than
sentence-length checks in CI.

## Build and validation

Use pnpm and the scripts in `package.json`. Website builds and Playground
execution tests require generated compiler assets.

```shell
pnpm install
pnpm sync
pnpm dev
pnpm playground:build
pnpm format:check
pnpm build
pnpm test
pnpm check:links
```
