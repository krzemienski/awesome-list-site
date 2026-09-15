---
name: Headless capture determinism
description: Rules for byte-identical full-page captures in headless Chromium (backdrop-filter, partial raster, frozen clock, React-mount/document-stamp checks, per-frame API quiet, font readiness, session-snapshot ordering, wait-excluding budgets).
---

## Rules

- **Neutralise `backdrop-filter` on BOTH sides** (blur is non-deterministic in
  headless Chromium), but collect each page's non-`none` set BEFORE
  normalising and fail the row on a set mismatch — otherwise a page can ship
  without its blur unnoticed. Record every normalisation in the results.
- **Launch with `--disable-partial-raster`.** `fullPage` frames otherwise flip
  single anti-aliased pixels A/B/A/B forever (tile reuse across the re-raster
  `captureBeyondViewport` triggers). Do NOT "fit the viewport to the document"
  instead: it is stable but grows every `vh`/`vw` box. Bisecting the CSS
  normalisations is a red herring (timing-dependent flip).
- **Do not trust selectors before React mounts.** The crawler prerender inside
  `#root` (and its `#ssr-seo-hold` overlay) satisfies `main h1`; require the
  React container and the absence of both before settling.
- **Stamp the settled document and bracket EVERY frame** (before/after) with:
  stamp present, no hold overlay, React mounted, same-origin `/api/` idle
  again, no new 429/5xx since the settle; discard a frame during which a
  request started or finished. Read the row's API failures from the live
  tracker at the end, never a settle-time snapshot. Capture a side right after
  its own settle instead of opening the other side first.
- **Fonts:** force-load every declared face of the required families (per
  family|style|weight, latin subset) on both sides; incomplete/failed loads
  fail the capture (reopen once), a used-but-unregistered canonical face
  (synthetic italic) is a deterministic row defect. Two sides that both fell
  back compare equal — that is the trap.
- **Freeze `Date`** (`clock.setFixedTime`) on both sides and hand the same
  instant to any adapter deriving "n ago" literals. `clock.install()` stalls
  handshakes.
- **Accept a capture only when two consecutive raw frames hash identical.**
- **Session snapshots expire (~1 min) inside a frozen-clock context:** every
  deliberate wait (limiter windows, retries, deferrals) happens BEFORE
  `storageState()`, and the auth check runs right after the page opens. Tell:
  "not authenticated" right after a recorded multi-minute wait.
- **Wait-excluding row budgets baseline before the row starts** (pass a thunk,
  not a running promise), or the row's own synchronous wait entry is charged
  against it.
- **Never mock rate-limited calls.** Track same-origin traffic per page, fail a
  side on any 429/5xx, learn per-load cost from `RateLimit-*`, defer throttled
  cells behind the plan, sleep only when nothing else remains. The PG limiter
  outlives the harness (a fresh run can start inside a full window).
- **Reference SPA actions need STRUCTURED tokens** (entity objects); a flat map
  makes the page component unmount silently (60 s timeout, no clue). Make
  in-page lookups throw and dump screenshot+console on any settle failure.
- Pre-seed consent decisions in localStorage (user state, not masking) and
  record it; expect live AI content rows to move by well under a point between
  runs (everything else reproduces exactly).

## Operating the runs

- The runner hashes its own module files at start and end: finish edits (and
  move probe scripts out of the harness dir) BEFORE starting a run.
- Keep anything that must outlive a run in a git-ignored, watcher-excluded
  workspace dir (`.cache/…`): a workspace restart wipes `/tmp` and everything
  under `/home/runner` outside the repo. A killed runner may leave its
  disposable identity behind; verify exact-owned teardown before the next
  run, and never sweep another worker's identities.

## Atomic surface readiness

Assert the intended surface inside the same browser evaluation that samples
its styles, not only in an earlier visibility wait. Wait for the route's
actual content before waiting for its entrance animations.

**Why:** A lazy page may mount after a global animation check has already
passed. An authenticated page may also briefly return to its loading spinner
after an earlier ready selector was visible, causing a style audit to label
the spinner as the intended admin panel.

**How to apply:** Keep a component-owned ready marker and route identity in
the sampling transaction. Retain failed captures, then confirm only the
affected cell and record the replacement's provenance.
