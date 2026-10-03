# Carven website

## Scope and content

- Make changes only in this website repository. The neighboring compiler may be read to verify claims; do not modify its source or build state.
- Use `./sitew` for website development, formatting, builds, tests and link checks. Dependency versions and supported runtimes are defined in `package.json` and the lockfile.
- Keep Chinese and English content, examples, routes and chapter ordering aligned. Verify substantive example changes against an identified compiler revision; website tests do not establish language correctness.
- When syncing compiler changes, consult `docs/content-sync.md` if present. It is a local, ignored maintenance record and must not be force-added. Keep README focused on the website introduction; do not add implementation diaries or review logs to published documentation.

## Implementation boundaries

- Follow the existing React, TanStack Start/Router, Vite and TypeScript structure. Keep Markdown rendering and Shiki highlighting in the build pipeline, with article HTML loaded through its own route. Keep browser-only APIs out of server rendering.
- Author articles in `src/content/`; the content pipeline generates their individual route modules and explicit flat route definitions in `src/generated/`. Keep only custom pages and the root shell in `src/routes/`; Vite combines both through TanStack's virtual route configuration. Regenerate `src/generated/` and `src/routeTree.gen.ts`; do not hand-edit or commit them.
- Use the existing Effect services and scoped lifetimes for content I/O and rendering. Release resources on failure and interruption; clean up React effects and DOM listeners on unmount.
- Preserve the paper-and-ink design, readable typography, keyboard access and both color themes. Reuse the shared locale and URL helpers so static HTML and client navigation honor the same deployment prefix.

## Tests and validation

- Test current invariants and contracts: valid inputs produce the required result; invalid inputs are rejected at the responsible boundary. Each case must cover a distinct rule or boundary.
- Do not add compatibility matrices, historical-output snapshots or regression cases solely to preserve previous behavior. Do not assert private implementation details or duplicate compiler semantic tests in the website suite.
- Keep assertions on observable outcomes, such as exact source preservation, valid bilingual navigation, rejection before publication, and resource cleanup. Use the responsible layer rather than repeating the same contract at every layer.
- During implementation, run the tests relevant to the change. Before release, run `./sitew format:check`, `./sitew build`, `./sitew test` and `./sitew check:links`; build includes TypeScript checking.
- Asset or URL changes also require a build and link check with a non-root `BASE_PATH`, using the same value for both commands. This validates the deployment URL contract. For interaction changes, verify the affected keyboard, focus and responsive behavior; distinguish actual device checks from viewport emulation.

## Cleanup and release

- Stop previews with `./sitew stop` before requested cleanup and confirm with `./sitew status`. Remove only identified, reproducible outputs and caches; preserve dependencies, user settings and local maintenance records. Do not broadly delete ignored files.
- Remove authored assets only after checking their references. Retain licenses for assets still in use. Keep generated output, caches and screenshots out of Git.
- Commit, push and deploy only when requested; authorization already given in the conversation remains valid. Use the existing `.github/workflows/pages.yml` workflow for GitHub Pages. Confirm that the workflow succeeded for the pushed commit before reporting deployment complete.
