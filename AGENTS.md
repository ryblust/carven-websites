# Carven website

- Work only in this website repository; do not change the neighboring compiler.
- Use `./sitew` for local commands. Stop the preview with `./sitew stop` when requested.
- When syncing compiler changes, consult `docs/content-sync.md` if present; it is a local, ignored maintenance record and must not be force-added.
- Keep Chinese and English content aligned. Validate language claims against the compiler and verify changed examples.
- Preserve the paper-and-ink design, readable typography, keyboard access and both color themes.
- Run formatting, build, tests and link checks before release. Asset or URL changes also need a non-root `BASE_PATH` build and link check.
- Keep README focused on the website introduction. Do not add implementation diaries, review logs or internal design documents.
- Keep generated output, caches and screenshots out of Git. Retain required asset licenses.
- Commit, push and deploy only when the user requests it.
