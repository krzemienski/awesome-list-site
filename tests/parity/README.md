# Visual parity harness

`npm run test:parity` compares the **local app** (and, for artifact rows, the
local design-system artifact) against the canonical design source
`awesome-list-site-ds/`, pixel for pixel, in a real Chromium. It is the gate
every page task must pass; it never edits app, artifact or design source.

The comparison target is always the local app on `127.0.0.1:5000`. Production
(`https://awesome.video`) is compared by a different tool — see
"Production baseline" at the end.

## Prerequisites

| Need | Why |
|---|---|
| App running on `http://127.0.0.1:5000` (`npm run dev`) and `BASE_URL` set to it | every app row is captured from it; only loopback origins are accepted |
| Artifact running (registered port `20928`) and `ARTIFACT_BASE_URL` set | only when a selected row has kind `artifact` (`artifact.*`) |
| `CLERK_SECRET_KEY` (test instance) and `ADMIN_PASSWORD` (≥ 8 chars) | to create, promote and delete the disposable admin identity; without them the run degrades to `--as visitor` and says so |
| Pinned Playwright Chromium under `.cache/ms-playwright` | the runner refuses to download a browser and refuses a version other than the pinned one |
| `awesome-list-site-ds/` unchanged | the design snapshot is hashed at start and end; a change during the run marks the evidence stale |

## Commands

```sh
npm run test:parity -- --list                         # every row with its class; no server needed
npm run test:parity                                   # full run: all rows, all widths, admin identity
npm run test:parity -- --only app.home.index,app.category --width 375,1440
npm run test:parity -- --screen app.admin.overview --width 1024
npm run test:parity -- --as visitor --only app.about  # signed-out evidence, never counted
npm run test:parity -- --determinism 3 --only app.home.index,app.category,app.shell.mobile-drawer --width 375
npm run test:parity -- --sweep                        # delete leftover __qa_test_parity_ identities
npm run test:parity -- --report tests/parity/baseline/<run>/results.json   # re-render the reports
npm run test:parity -- --keep-user ...                # keep the disposable admin for manual inspection
```

`--list` prints one of four classes per row: `pixel` (compared, counted),
`token-only` (no design counterpart; token audits only), `artifact-docs`
(design-system docs chapter; evidence only) or `blocked:<reason>`.

Exit codes: **0** every executed pixel row passed (a full admin run also needs
the gate: no FAIL, no BLOCKED, inputs unchanged); **1** a pixel row failed or was
blocked; **2** precondition, CLI or infrastructure failure (including an
incomplete identity teardown — the results are still written). `--sweep` exits
**0** only when nothing is left on either side: any deletion failure or any
remaining `__qa_test_parity_` user, local or Clerk, exits 2 with the JSON
summary (`failed`, `remaining`, `clerkRemaining`) on stdout.

## What a run produces

`tests/parity/baseline/<run-id>/` (read-only once copied from `/tmp`):

- `results.json` — every row with status `PASS | FAIL | BLOCKED | EVIDENCE |
  UNVERIFIED | ALIAS`, the diff numbers, both capture hashes and stability
  attempts, the identity check, the `backdrop-filter` sets, font parity, and the
  run-level `identity`, `configuration`, `provenance` and `selection` blocks.
- `actual/`, `expected/`, `diff/` PNGs per row (`<id>-<width>.png`, plus the
  raw `.attempt-n.png` / `.repeat.png` frames that prove the capture was stable).
  The frames are hashed in `results.json` and `OUTPUT-MANIFEST.json` but stay
  local (`.gitignore`); only the accepted captures and diffs are committed, and
  the root `tests/parity/{actual,expected,diff}` mirrors never receive frames.
- `font-gaps.md` — the `@font-face` gap table for every row that failed font
  parity (copied to `docs/parity/evidence/harness/font-gaps.md` by full admin
  runs only).
- `REPORT.md` — the human report. A **full** run (no `--only`/`--width`) also
  writes the same content to `docs/parity/REPORT.md` and `tests/parity/REPORT.md`;
  a full **admin** run additionally regenerates `docs/parity/STATUS.md`,
  replaces the root `tests/parity/{actual,expected,diff}` copies and refreshes
  `docs/parity/evidence/harness/sample-diffs/` (actual, expected and diff of
  three representative rows, suffixed `.actual/.expected/.diff.png`). Selected
  (`--only`/`--width`) runs leave the shared reports alone, so a diagnostic never
  overwrites the whole-inventory report. The report also quotes the standalone
  determinism evidence and lists the run's recoveries (rate-limit waits,
  deferrals, document reloads).
- `diagnostics/<row>-<width>-<side>.{png,json}` for every side that failed to
  open or settle: the page as it stood, URL, title, the first 600 characters of
  body text, console errors, page errors, failed requests and same-origin API
  failures. Row records point at the JSON via `diagnostics`; diagnostic
  captures never enter a comparison.
- `OUTPUT-MANIFEST.json` — sha256 of every file above.
- `determinism/` and `determinism.json` in determinism mode; the triplets are
  also copied to `docs/parity/evidence/harness/determinism/`.

## Identity

App rows are captured as a **disposable Clerk admin named "Nick"**, matching
the design demonstrator. At run start the runner creates a Clerk user
(`__qa_test_parity_<suffix>+clerk_test@example.com`, numeric bridge id in the
2 000 000 000+ range), signs in through the real `/sign-in` UI, promotes it via
the audit-key admin API, reads `/api/admin/*` through that session to feed the
design's admin globals, and at the end deletes the local row and the Clerk user
and re-checks that no `__qa_test_parity_` user remains. Per-row contexts start
from a fresh `storageState()`; each row re-checks `/api/auth/user` before
capturing. Credentials live only in memory. Use `--sweep` if a crashed run left
identities behind, and `--keep-user` to keep one for manual inspection.

## Capture rules

- Chromium, DPR 1, en-US, UTC, dark color scheme, reduced motion, fixed viewport
  heights per width (`375→812, 768→1024, 1024→768, 1440→900`), full-page PNG.
- Chromium is launched with `--disable-partial-raster` (recorded as
  `configuration.chromiumArgs`). Full-page capture re-rasters the page for
  every frame and, with partial raster on, reused tile content flips single
  anti-aliased pixels on rounded corners between consecutive frames — the
  design's About page alternated between two frames forever (A/B/A/B) while
  nothing in the DOM moved. With the flag, 18/18 frames across three fresh
  browsers were byte-identical. Growing the viewport to the document instead
  was rejected: it changes `100vh` layouts (the app's About page grew from
  4.2k to 7.7k pixels), which a full-page shot does not.
- Both sides run on a **frozen clock** (`clock.setFixedTime`, run start rounded
  to the minute, recorded as `configuration.frozenAt`); the reference adapter
  computes the design's relative-time and "this week" literals from the same
  instant.
- Pre-seeded state on both sides: Editorial × Crimson theme; on the app side
  also `analytics-consent = denied` so the consent prompt (which the design
  does not have) never renders. This is user state, not masking.
- Normalisations applied identically to both sides, listed in
  `configuration.captureNormalisations`: animations/transitions off, caret
  transparent, `backdrop-filter: none` (headless Chromium rasterises blur
  non-deterministically). Each page's non-`none` `backdrop-filter` set is
  collected *before* normalisation; a mismatch fails the row.
- Fonts: the nine parity families are forced to load on both pages and their
  declared `@font-face` sets diffed; any gap fails the row (`fontGap`).
- Identity checks per family prove both sides show the same entity before
  pixels are compared: category, subcategory and resource rows need the
  `main h1` on BOTH sides to equal the catalogue label; the leaf row needs the
  app heading plus the leaf named in the reference main content (the design
  keeps the parent heading and names the leaf in the breadcrumb); home needs
  the first three category names; admin rows need the REQUESTED tab active on
  both sides. Label searches are scoped to the main content with navigation
  removed — the sidebar lists every label on every page, so a body-wide match
  would prove nothing. A mismatch fails the row (the pixels are still measured
  and the reason names the side).
- A capture is accepted only when two consecutive raw full-page frames are
  byte-identical (up to eight attempts); blank or loading DOM is rejected.
- The app side is not trusted until React has mounted on `#root` and the
  crawler prerender (`#ssr-seo-content`) and its hold overlay (`#ssr-seo-hold`)
  are gone. Both satisfy plain ready selectors such as `main h1`; during a
  cold Vite compile the prerender was once captured and diffed as "the app".
- The settled document is stamped (`window.__parityDocument`) and every frame
  is bracketed by a check that the stamp is still there, the hold overlay has
  not returned and React's container is still on `#root`. A full reload in
  that window (the app's Vite dev server reloads open pages on HMR, dependency
  optimisation **and on any file change it watches — which is the whole
  workspace outside `.local`, `.cache`, `.git`, `node_modules`, `dist`,
  `attached_assets`, `.agents`, `logs`**) would otherwise be captured as the
  post-reload boot: two identical frames of the hold overlay passed the
  stability check once and were diffed as the About page. Such a side is
  reopened from scratch (fresh context, same action, full settle) at most
  twice; the discarded frames are kept under `diagnostics/<row>-<side>-reload-
  <n>.*` and each event is listed in `configuration.documentReloads`
  (`reopenedAfterReload` on the row). The reopen counts against the row
  budget. **Do not write files anywhere in the workspace while a run is in
  progress** — not even markdown; the runner itself stages every output in
  `/tmp` and copies it in only after the browser is closed. Notes or
  evidence you must write while a run is in flight belong in a git-ignored,
  watcher-excluded directory such as `.cache/` (`/tmp` does not survive a
  workspace restart). A run killed mid-way leaves its disposable admin
  behind — run `--sweep` before the next one.
- The app's own same-origin `/api/` traffic must be idle (no request in flight
  for 750 ms, repeated until a settle round sees no new completions) before a
  frame counts, so the signed-in home is captured after its ~10 s
  recommendation call lands, not at a timing-dependent loading state. Any
  `429` or `5xx` from the app during a row makes the side untrustworthy: the
  row fails with `capture failed: app API failed during capture (...)`, and
  every 4xx/5xx is listed in the row's `apiFailures`.

### Rate-limit budget

The signed-in home page issues two `POST /api/recommendations` per load; that
route sits behind the app's AI limiter (10 requests per 15 minutes per IP).
The harness never works around the limiter. It reads the standard
`RateLimit-*` headers the app returns, remembers which rows consume each
limiter and how many hits one load costs, and refuses to open another consumer
row while the window is closed: the cell is **deferred behind the remaining
cells** (recorded in `configuration.throttleDeferrals`) so the wait overlaps
other captures, and only slept (`configuration.throttleWaits`) when nothing
else is left. A `429` that still arrives (the app's rate-limit store outlives
the harness, so a window filled by an earlier run can hit the first row)
triggers one wait-and-reopen of that side. Waits are excluded from the 150 s
row budget, so a full admin run can legitimately pause for up to 15 minutes at
a time. Two ordering rules make those pauses safe: the row's session snapshot
is taken *after* the wait (a Clerk token is only good for about a minute
under the frozen clock), and the budget's wait baseline is read *before* the
row starts (the wait is the row's first, synchronous act). Both were learned
from failed runs; see `docs/parity/evidence/harness/session-refresh/`.

### Union-canvas rule

Captures are never resized or cropped. When the two sides differ in size they
are placed top-left on a canvas of `max(width) × max(height)`; the overlap is
compared with pixelmatch (threshold 0.1, `includeAA: false`) and **every pixel
outside the overlap counts as differing**. `diffPercent` is
`differingPixels / canvasPixels × 100`; the ceiling is 0.5 %.

### No-masking rule

No region is ignored, blurred, painted over or excluded. Dynamic content is
handled by making both sides show the same data (adapter + frozen clock + real
identity), never by hiding it. The only per-side state changes are the
pre-seeded localStorage entries above, and every normalisation is applied to
both sides and recorded in the results.

## Adding a fragment (page tasks)

Rows live in `tests/parity/inventory/*.json`, one fragment per surface family
(`config.json` holds the shared widths/eligibility text). A fragment is either
a `family` with `screens[]` or a config block; `node tests/parity/inventory.mjs
--write` merges them into `inventory.json` and refreshes
`inventory.schema.json`, and the runner refuses to start when the merged file
is stale. Each screen declares:

- `id` (`app.<family>.<name>` or `artifact.<name>`), `kind` (`app` | `artifact`),
  `eligibility` (`pixel` | `token-only` | `artifact-docs` | `blocked`; the last
  three carry a `reason`), optional `widths` subset, optional `aliasOf`.
- `actualPath` / `referencePath` templates (tokens such as `{categorySlug}` are
  resolved from the live catalog), a shared `readySelector` or per-side
  `actualReadySelector` / `referenceReadySelector`, optional `actualAction` /
  `referenceAction` (`open-mobile-drawer`, `admin-tab:<slug>`, `open-tweaks`,
  …), optional `requires: ["admin-session"]`, and an `identityCheck` kind.

The schema (`inventory.schema.json`) documents every field; validation errors
name the fragment and row.

Run `--only <id>` for the new row, look at `actual/`, `expected/` and `diff/`,
and commit the fragment together with the page change. The row is counted in
the denominator as soon as its eligibility is `pixel`.

## Production baseline (`production-baseline/<YYYY-MM-DD>/`)

A separate, dated record of what `https://awesome.video` served an anonymous
visitor — full-page PNGs at 375/768/1024/1440, DOM summaries, HTTP status and
redirect chains, axe results, raw API bodies with shape descriptions, and
mobile Lighthouse reports. It is captured with `npm run baseline:capture`
(`scripts/validation/production-baseline-capture.mjs`, resumable per route ×
viewport, read-only sandboxed Chromium, navigation budget) and diffed with
`npm run baseline:compare -- --baseline <dir> --against <url>`
(`production-baseline-compare.mjs`, exit 1 on tracked deltas). It is **not** the
pixel gate above: its reference is production, not the design source. Each
baseline's `README.md` records the date, tool commit, exact command and the
production quirks seen that day.
