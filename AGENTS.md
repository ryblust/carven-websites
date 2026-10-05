# Carven website

## Project model

- Work in this website repository. Use the neighboring compiler as a read-only reference for language behavior.
- Use `pnpm install` and the scripts in `package.json`. Treat `package.json` and the lockfile as the dependency and runtime baseline.
- Write articles in `src/content/` and custom pages in `src/routes/`. Regenerate article routes in `src/generated/` and `src/routeTree.gen.ts` through the content pipeline.
- Keep README to the project introduction and links. Put repository rules here and subsystem procedures beside their scripts. Keep published documentation focused on website users.
- Describe current mechanisms, responsibilities and reasons for choices. Keep local maintenance records focused on current baselines, validation evidence and open work.
- Sync compiler changes from the compiler repository's `main` branch. Consult `docs/content-sync.md` for the current baseline; keep this record local. Read `scripts/playground/README.md` for the browser compiler's build and execution contract.

## Implementation

- Start from the smallest model that satisfies the task. Prefer fixed paths, existing conventions and built-in tool capabilities. Add configuration and abstractions when a concrete requirement calls for them.
- Follow the existing React, TanStack, Vite and TypeScript structure. Render article Markdown and Shiki highlighting during the build. Access browser APIs from client lifecycles.
- Use Effect services and scoped lifetimes for content I/O and rendering. Release resources on completion, failure and interruption; clean up React effects and DOM listeners on unmount.
- Align Chinese and English content, examples, routes and chapter order. Verify substantive example changes with an identified compiler revision.
- Preserve the paper-and-ink design, readable typography, keyboard access and both themes. Use shared locale and URL helpers for deployment prefixes.
- Execute Playground commands with the packaged Carven compiler in a dedicated browser worker. CI checks out the compiler's latest default-branch commit. Build assets with `pnpm playground:build` when inputs change or assets are missing; reuse verified assets for page-only edits.

## Validation

- Test current invariants through accepted inputs and expected errors. Give each case a distinct contract at the responsible layer, including source preservation, navigation, publication and resource cleanup.
- Run relevant tests during implementation. Before release, run `pnpm format:check`, `pnpm build`, `pnpm test` and `pnpm check:links`; build includes TypeScript checking.
- For asset or URL changes, build and check links with the same non-root `BASE_PATH`.
- For interaction changes, verify keyboard, focus and responsive behavior. Report device checks and viewport emulation accurately.

## Delivery

- Run development and preview servers in the foreground. Stop them with Ctrl+C and verify exit before cleaning their outputs.
- Clean identified, reproducible outputs and caches. Preserve dependencies, user settings and local maintenance records. Keep generated artifacts, caches and screenshots outside version control.
- Check references before removing authored assets. Retain licenses for assets in use.
- Follow the user's authorization for commits, pushes and deployment. Deploy through `.github/workflows/pages.yml` and verify workflow success for the pushed commit before reporting completion.
