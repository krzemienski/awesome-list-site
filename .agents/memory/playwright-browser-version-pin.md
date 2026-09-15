---
name: Playwright browsers on this host
description: Why browser launches fail or WebKit misbehaves here, and the rules that avoid re-debugging it (revision source, WebKitGTK runtime, Clerk cookies, hover-only controls).
---

**Rule 1 — one package decides the browser revision.** Import `chromium`/`firefox`/`webkit` from `@playwright/test` (the package that runs the suite), never from the floating root `playwright` dependency, and install browsers with the repo's `test:e2e:browsers` script (workspace cache `.cache/ms-playwright`, which survives restarts; `~/.cache` does not).
**Why:** two packages expect two revisions; the wrong one reports "Executable doesn't exist" even though a browser is installed, and reinstalling clobbers harnesses that pin the cache.

**Rule 2 — WebKitGTK needs the Nix runtime handed to it explicitly** (all in `playwright.config.ts`): skip-host-check flag on the *test worker* (the check reads ldconfig, not the env), `REPLIT_LD_LIBRARY_PATH` as the browser's `LD_LIBRARY_PATH`, `headless:false`, video off, and the `glib-networking` system package exposed through `GIO_EXTRA_MODULES`.
**Why:** each omission has a distinct silent symptom — worker refuses to launch; browser aborts at start; `newPage` hangs intermittently; every https request fails "TLS support is not available" so Clerk's form never renders.

**Rule 3 — WebKit + Clerk dev instance over http can never authenticate server-side.** Clerk writes `__session`/`__client_uat` as `SameSite=None` without `Secure`; WebKit drops them. `window.Clerk.user` is set, `/api/auth/user` stays anonymous. Skip server-authenticated Clerk specs on webkit over http with a stated reason; do not "fix" app code (prod is https).
**How to apply:** a fixture that times out mid-provisioning leaks its Clerk user with no local row — sweep by creation time, never by prefix alone.

**Rule 4 — touch projects never satisfy `group-hover:`** (Tailwind gates it on `@media (hover: hover)`); drive hover-only controls (toast close) via focus + Enter.

**Rule 5 — long parallel sweeps flake under 3 workers, not solo.** Split multi-cell tests per dimension instead of tripling timeouts; wait for `load` before a Firefox `goto` (else `NS_BINDING_ABORTED`). Firefox's `context.newPage()` for axe's helper page hangs or fails about once per full run (4/4 runs, always a Task549 admin a11y cell, never solo) — no spec can absorb a hung `newPage`; the config allows ONE local retry so it reports as flaky, never as a silent pass. Full runs take ~26 min; background them and never write to the repo meanwhile.

Sandbox: `chromiumSandbox: true` is the switch; removing `--no-sandbox` from custom args does nothing. Shell: `pkill -f "playwright test"` kills the invoking shell too — use the background task id.
