---
name: Headless capture determinism
description: Why byte-identical full-page captures failed in headless Chromium and how the parity harness gets them (backdrop-filter, partial raster, frozen clock, stability frames, React-mount and document-stamp checks, wait-before-snapshot session ordering, wait-excluding row budgets, structured tokens for reference actions).
---

## backdrop-filter blur is non-deterministic in headless Chromium

Three fresh contexts of the same static page differed by tens of pixels
around elements under `backdrop-filter: blur(14px)` (header, chips). Nothing
else in the page changed. **Rule:** neutralise `backdrop-filter: none` on BOTH
sides as a capture normalisation, but collect each page's non-`none` computed
`backdrop-filter` set BEFORE normalising and treat a set mismatch as a row
defect — otherwise a page can silently ship without its blur. Record the
normalisation list in the results.

**Why:** the previous harness recorded the 68-pixel drift as an unexplained
blocker; the pixel gate (0.5 %) needs identical reference captures.

## `fullPage` frames flip anti-aliased pixels: launch with `--disable-partial-raster`

On some pages (design About page, admin tabs) single anti-aliased pixels on
rounded corners and the footer tile flipped ±1 grey level between two values
on EVERY consecutive full-page frame (A/B/A/B, never two identical) while every
bounding rect stayed put. Root cause is Chromium's partial raster reusing tile
content across the re-raster that `captureBeyondViewport` triggers on each
full-page shot. **Rule:** launch Chromium with `--disable-partial-raster` on
both sides (18/18 frames identical across fresh browsers) and record the args
in the results. Do NOT "fit the viewport to the document and take a plain
shot" instead: it is pixel-stable but resizes the layout viewport, so every
viewport-relative box (`100vh`, `vw`) grows with the document and the capture
no longer shows what a user at that width sees. Bisecting the normalisation CSS was a
red herring — the flip is timing-dependent, so each property alone looks
stable by luck.

## The app side can be captured before React mounts

og-middleware ships crawler prerender inside `#root`, and the client parks it
in a fixed `#ssr-seo-hold` overlay until data arrives; both satisfy plain ready
selectors such as `main h1`. The first row after a cold Vite compile was
captured as the prerender and diffed as "the app". **Rule:** before trusting
any selector require React's container on `#root` and the absence of
`#ssr-seo-content` / `#ssr-seo-hold`.

## Stamp the settled document and re-check it around every frame

Any workspace write during a run (see the Vite watcher memory) reloads open app
pages; a reload between the settle check and the frames yields a static
prerender that two frames happily agree on. **Rule:** after settling, stamp the
document (`window.__parityDocument = <random token>`) and bracket every frame
— before and after — with "stamp present, no hold overlay, React mounted". On
failure (or a destroyed execution context) reopen the side from scratch, at
most twice, and record the event in the results.

## Session snapshots expire during long waits

A Clerk session snapshot (`storageState()` after `getToken({ skipCache: true })`)
is only good for about a minute inside a frozen-clock context. Any deliberate
wait — limiter windows, retries, queue deferrals — must happen BEFORE the
snapshot, and the auth check must run right after the page opens. The tell is
a row that fails "not authenticated" immediately after a recorded multi-minute
wait while every other row is fine.

## Row budgets that exclude waits must baseline before the row starts

If a per-row timeout subtracts "time spent waiting" by diffing a shared wait
ledger, take the baseline BEFORE invoking the row (pass a thunk, not a running
promise). A row whose first act is the wait pushes its ledger entry
synchronously, so a baseline taken after the promise was created already
contains it and the whole wait counts against the row ("exceeded the row
budget" right after a recorded multi-minute wait is the tell). Rehearse the
wait path in isolation before a long run: enough consumer rows in one `--only`
selection to exhaust the window forces a deferral-free in-row wait.

## App rate limits during signed-in captures

A signed-in home load fires two AI-limited POSTs (10/15 min per IP), the
sign-in itself lands on the home page (two more), and the app's PG-backed
limiter outlives the harness, so a fresh run can start inside a full window.
Never mock the call: track same-origin API traffic per page, fail a side on
any 429/5xx, read the `RateLimit-*` headers to learn which rows consume the
limiter and the per-load cost, defer throttled cells behind the rest of the
plan, and only sleep when nothing else remains. The PG store can also fall
back to memory for ~30 s ("Postgres store unavailable"), during which hits are
not persisted.

## Other determinism requirements that bit

- Freeze `Date` with `clock.setFixedTime` on both sides and pass the same
  instant to any data adapter that derives "n ago"/"this week" literals.
- Accept a capture only when two consecutive raw frames hash identical.
- Reference SPA actions need the STRUCTURED catalog tokens (entity objects);
  passing the flat `values` map made the design's page component receive
  `undefined` and unmount the whole tree (`main` never visible, 60 s timeout
  with no clue). Make in-page lookups throw on a missing entity, and dump
  diagnostics (screenshot + console/page errors) whenever a side fails to
  settle — the page error names the culprit instantly.
- The app's consent banner overlays captures; pre-seed the consent decision in
  localStorage (user state, not masking) and record it.
- Live AI-generated content (home recommendations) differs per run by design;
  expect those rows to move by well under a percentage point between runs and
  do not mistake it for capture jitter (every other row reproduces exactly).

## Harness fingerprint gotcha

The runner hashes its own `tests/parity/*.{mjs,json}` at start and end; editing
harness files while a long run is in flight marks that run's evidence stale.
Finish edits first, then start the run. Temporary probe scripts that import the
harness deps must also leave `tests/parity/` before a run starts.

## Keep run-adjacent scratch inside the workspace

A workspace restart wipes `/tmp` and everything under `/home/runner` outside
the repo — a 56-minute run, its log, the gate snapshots and the evidence
drafts all vanished at once. Keep anything that must outlive a run in a
git-ignored, watcher-excluded workspace directory (`.cache/…`); only the
runner's own staging belongs in `/tmp`, because a partial run is worthless
anyway. A killed run also leaves its disposable identity behind: `--sweep`
before the next one.
