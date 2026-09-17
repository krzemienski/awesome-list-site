# Production release record

Latest product changes and real-browser outcomes are recorded in the
[parallel repair report](worklog/site-repair-2026-09-17.md). No publishing
action was taken, and historical pixel results below remain historical.

## Latest local redesign follow-through — 2026-09-17

The working tree based on `a09ad484` includes further verified responsive,
rendering, taxonomy and admin-menu fixes described in
[the current report](worklog/redesign-resume-2026-09-17.md).
This session did not publish or change production configuration. Earlier
"not published" statements below belong to their recorded historical
candidates, not to the application's entire deployment history.
Full final-candidate certification remains incomplete; no new release-ready
claim is made here.

The current full-inventory measurement is
`tests/parity/baseline/2026-09-17T11-42-39-272Z-11572` ([REPORT.md](REPORT.md),
[STATUS.md](STATUS.md)): **133 pass / 51 fail** of 184 executed pixel rows,
gate **NOT PASSED**. The 26 failures beyond the 25 recorded below are the
contract-over-reference residuals listed in
[IMPLEMENTATION.md](IMPLEMENTATION.md#cross-cutting-decisions-recorded-this-pass)
(768 tablet sidebar, artifact narrow-screen fit, category intro copy) plus two
live-data rows 0.01pt over the ceiling; `app.subcategory` 375/1024/1440 were
repaired afterwards and pass in a selected rerun. All 50 theme combinations
pass a persistence probe
([evidence/tokens/50-combo-2026-09-17/](evidence/tokens/50-combo-2026-09-17/)).
The section below describes the earlier 159/25 run and is kept as history.

## Decision — HOLD (2026-09-17, updated after the fourth full-inventory run)

Candidate: the working tree that becomes the next commit on `main` after
`99100aa8` — see `git log` for the exact SHA. **Not published; publishing has
not been initiated.** No deployment configuration was changed and no
production data was written. The *local* release checks below (static gates,
pre-publish gate, prod-mode smoke, bundle secret scan, loopback Lighthouse)
pass on this candidate. What still holds the release: the pixel gate is
**NOT PASSED** (25 failing cells — each is *documented* with a cause and an
owner decision in IMPLEMENTATION.md; "documented" is this task's assessment,
not an owner sign-off), independent verification is BLOCKED against an
earlier candidate and has not been repeated here, production configuration
is UNVERIFIED, and the actual publish-image size is UNVERIFIED until a user
publish.

The full-inventory run `tests/parity/baseline/2026-09-17T00-31-04-404Z-444`
(all four widths, admin identity) is the current measurement
([STATUS.md](STATUS.md), [REPORT.md](REPORT.md), per-area reasons in
[IMPLEMENTATION.md](IMPLEMENTATION.md)):

- 184 executed pixel cells: **159 pass, 25 fail**, 0 incomplete; 40 blocked
  cells, 4 aliases and the token-only rows stay outside that denominator. The
  previous full runs were 83/101, 56/128 and 16/172.
- App cells: **79 of 92 pass.** The 13 failing app cells are all recorded
  residuals: `app.admin.overview` 375 (reference overflows to 400px),
  `app.admin.linkhealth` 375 and `app.admin.users` 375 (product behaviour kept
  by contract), `app.admin.researcher` 375/768/1024 (0.61–0.82%, live jobs vs
  the frozen fixture), `app.admin.categories` / `app.admin.subcategories`
  375/768/1024 (0.51–0.73%, icon set plus live counts) and `app.admin.github`
  375 at 0.518%.
- Artifact cells: **76 of 88 pass.** The `@font-face` gap that failed every
  artifact cell in the previous run is closed (0 gaps on 188 rows,
  [font-gaps.md](evidence/harness/font-gaps.md)). The 12 remaining failures
  (`artifact.docs.buttons`, `artifact.docs.forms`, `artifact.showcase`) are
  the 44px accessible-control floor the artifact keeps by contract; see the
  cross-cutting decisions in IMPLEMENTATION.md. The artifact's font `<link>`
  now ships without a static `href` (the boot script sets the per-view URL
  synchronously, `blocking="render"`), so a direct docs load can no longer
  preload the showcase faces first; this change post-dates the run above and
  is covered only by the responsive/pre-publish reruns, not by a new pixel run.
- Identity teardown was clean (0 `__qa_test_parity_` rows remaining); no
  document reloads or font-readiness reopens. The run still recorded
  `Inputs changed during run: YES — stale` (live adapter hashes move during
  capture), so it locates defects and measures this tree; it is not
  byte-exact proof of a committed SHA.
- The Journeys budget passes only under an upstream cap increase that the
  independent review identifies as requiring an owner decision. This task
  does not approve or further relax that increase.
- [Independent verification](VERIFICATION.md) still records acceptance
  BLOCKED against an earlier candidate; it has not been repeated here.

Static gates on this candidate (validation runs `PcEEqhUeM0QUDqBgL7A_L`,
`vJqeD4eWW6UxOdi7-0DqS`, `u7L8iPJtu0wOX_mmSjoue`, all PASS): typecheck,
dead-exports, palette-drift, canonical-token-parity, dead-components,
accent-drift, product-profile-browser, boot-safety, full migration-drift,
task302-build. Do not infer release acceptance from them.

## Pre-publish checklist

| Requirement | Result / evidence |
|---|---|
| Independent verification passed | **BLOCKED**, as above |
| Migration 0047 journaled | **PASS**, entry idx 23 in `migrations/meta/_journal.json` |
| Migration 0047 idempotent by inspection | **PASS**: column/table/index use `IF NOT EXISTS`; constraint additions use table-scoped `pg_constraint` guards |
| Journal integrity | **PASS**, fresh command below: all 27 migration files journaled, no orphans |
| `task302-build`; exact-candidate `npm run build && npm run bundle:budget` | **PASS** 2026-09-17: validation run `u7L8iPJtu0wOX_mmSjoue` (task302-build) and a fresh `npm run bundle:budget` — initial raw 593.1 KiB / gzip 185.3 KiB / brotli 156.2 KiB, admin route gzip 136.8 KiB, `Bundle budgets: PASS`; no cap was changed |
| `task302-boot-safety` | **PASS** on this candidate, validation run `vJqeD4eWW6UxOdi7-0DqS` |
| Full `migration-drift` | **PASS** on this candidate: validation run `vJqeD4eWW6UxOdi7-0DqS` (scratch-DB reproduction + sequences) and again inside the pre-publish gate below (15 s) |
| Local `bash scripts/pre-publish-gate.sh` with app running; retain step logs | **PASS** 2026-09-17T01:46Z, exit 0 with the app on :5000: typecheck 30 s, migration-drift 15 s, print-audit 36 s, responsive-audit 74 s (58/58 — the first attempt failed 3 checks: two phone breadcrumb checks that still asserted a visible width after the shell crumb became `sr-only` by design, and the sidebar category headers losing their forced-colors button border under `.accordion-header { border: 0 }`; both fixed in this candidate, see IMPLEMENTATION.md cross-cutting decisions), product-profile-drift 3 s, standalone-palette-drift 5 s, build 32 s, bundle-budget 6 s; step logs were in `/tmp/validation/pre-publish/` (workspace `/tmp` does not survive restarts) |
| Production config: `VITE_CONTACT_VARIANT` unset; router credential available | **UNVERIFIED**; no secrets accessed (the built `dist/` served `/api/config` contact options as unavailable in the local prod-mode smoke) |
| No secrets in client bundle | **PASS** on the gate's `dist/` (2026-09-17): every workspace secret value grepped against `dist/public` — 0 hits; pattern scan for `sk_live_/sk_test_`, `sk-ant-`, `ghp_`, credentialed `postgres://` URLs over `dist/public` and `dist/index.js` — 0 hits |
| Production-mode local build smoke: `/`, `/api/health`, `/sitemap.xml`, `/category/encoding-codecs` | **PASS** 2026-09-17 (`NODE_ENV=production node dist/index.js` on :5055 against the dev DB): all four 200 — `/` 123 KiB with `<title>Awesome Video — 1816+ Curated Video & Streaming Resources</title>`, canonical `https://awesome.video/`, nonce'd CSP, `Cache-Control: no-store`; `/api/health` `{"status":"ok"}`; `/sitemap.xml` 2,325 `<url>` entries; `/category/encoding-codecs` `<h1>Encoding & Codecs` with the crawl title `Video Encoding & Codecs: AV1, HEVC, H.264 — Awesome Video`; `/robots.txt` 200; unknown route 404 |
| Local production-mode Lighthouse, home | **PASS** 2026-09-17 (`npm run perf:lighthouse:normal -- --base http://127.0.0.1:5055`, three fresh-browser mobile runs against the same `dist/` on the loopback prod-mode server): performance 0.82 / 0.71 / 0.84, **median 0.82 (meets the 0.82 threshold)**; accessibility 0.98, SEO 1.00, best-practices 0.79 on every run — the deductions Lighthouse lists are `inspector-issues` (third-party cookie issues on the Clerk *development-instance* origin the dev keys point at) and `valid-source-maps`; whether they recur on the HTTPS production host is **not verified** (production Lighthouse is a post-publish check below). FCP/LCP 3.4–3.5 s, TBT 110–540 ms under Lighthouse's simulated throttling; loopback Lantern scores sit below same-code production scores, so compare like with like. Manifest plus the three per-run summaries (all four category scores, metrics, observed-request ledger with credentials redacted by the script) retained under [evidence/lighthouse/](evidence/lighthouse/); the full Lighthouse JSON reports (~264 KiB each) were not retained. Home was rerun after the category change below: 0.88 / 0.83 / 0.83, median 0.83 |
| Local production-mode Lighthouse, category and resource (three-route contract) | **PASS (all three routes)** 2026-09-17, after the pre-boot hold change below. `normal-lighthouse.mjs` gained `--path <same-origin path>` so the registered command audits one route per invocation (`npm run perf:lighthouse:normal -- --base http://127.0.0.1:5055 --path /category/encoding-codecs`); no new stack. **Before the change** (same `dist/` lineage, idle box): `/category/encoding-codecs` 0.80 / 0.75 / 0.78, median 0.78 (below 0.82) with FCP 2.2–2.9 s but LCP 3.3–3.6 s; `/resource/185020` 0.84 / 0.92 / 0.81, median 0.84. A PerformanceObserver probe showed why: the crawler prerender's lead paragraph painted at first paint, but `main.tsx` re-inserted those nodes into the `#ssr-seo-hold` overlay after the bundle executed, and the re-inserted paragraph (measured in the swapped web font, ~2% larger) became a second LCP candidate — so Lighthouse dated LCP to the bundle, not the document. **Change** (`client/index.html` pre-boot script + `client/src/main.tsx`): the overlay is now built before the first paint by the inline script that already ran after `#root`; it stays semantic and interactive (real h1, links, no `aria-hidden`/`inert`) until `main.tsx` adopts it (`data-preboot`, `data-pathname`) immediately before React mounts underneath — adoption applies `aria-hidden`/`inert` and the h1 demotion exactly as before, and removal on data/timeout/navigation is unchanged. A bundle that never runs therefore still leaves a usable page (verified headless with the entry chunk blocked: h1 present, 56 links clickable). The listing's facets error is only consulted while that query is enabled, so a cached panel error cannot replace a healthy listing after Back. The unfiltered listing also no longer fires the faceted `/api/resources` request that only fed the closed filter panel (`TaxonomyListing.tsx`: fetched once the panel opens or a filter is active). **After** (final rebuilt `dist/`, restarted loopback prod-mode server, three fresh-browser mobile runs per route, box idle, no source edits during the run): `/category/encoding-codecs` 0.79 / 0.89 / 0.84, **median 0.84 (meets)** — LCP now 2.3–3.0 s (was 3.3–3.6 s), TBT 291–428 ms, CLS 0.066; `/resource/185020` 0.86 / 0.85 / 0.77, **median 0.85 (meets)** — TBT 221–523 ms; home rerun in the same session 0.88 / 0.83 / 0.83, **median 0.83 (meets)**. Two earlier post-change runs (category medians 0.83 and 0.84, resource 0.91 and 0.84, home 0.83 and 0.82) agree but straddled source edits, so only the final run is retained. Accessibility 1.00 (category, resource) / 0.98 (home), SEO 1.00, best-practices 0.79 on every run (same `inspector-issues` / `valid-source-maps` deductions as the home row). An earlier attempt taken while the built-in browser tester was also running (category median 0.81, resource 0.76) is kept as `concurrent-load/`. Loopback Lantern sits below same-code production; production Lighthouse remains a **post-publish check**, and no threshold or budget was changed. Manifests, `scores.json` and per-run summaries (request ledgers redacted by the script): before under [evidence/lighthouse/three-routes-2026-09-17/idle/](evidence/lighthouse/three-routes-2026-09-17/idle/), after under [evidence/lighthouse/three-routes-2026-09-17/after-preboot-hold/](evidence/lighthouse/three-routes-2026-09-17/after-preboot-hold/); the full Lighthouse JSON (~260 KiB per run) is not retained in the repo |
| Publishing-only image trimming | **REPAIRED 2026-09-15.** Two user publish attempts (builds `f3055341…` 18:57Z and `ef717b35…` 22:02Z, deployment `b112b7e1…`) passed every gate step and then failed with `image size is over the limit of 8 GiB`; both logs show `SKIP image cleanup — not a Replit publishing container`. Cause: Replit sets `REPLIT_DEPLOYMENT=1` only at runtime, never during the build command, so the trim step could never fire. Fix: the marker is now the production-only env var `REPLIT_PUBLISH_IMAGE_TRIM=1` (set in Replit's production environment, absent from development), and the helper additionally refuses wherever `REPLIT_DEV_DOMAIN` exists (the interactive workspace). Verified on a disposable `/tmp` copy: refuses in the workspace with the marker set, refuses without the marker, removes only `tests/parity/baseline` (2.9 GiB) and `.cache/ms-playwright` (641 MiB) under build-container conditions; the real workspace tree was not touched. Workspace measured 7.1 GiB + 2.2 GiB `.git`; projected trimmed image ≈ 5.8 GiB. Actual image size remains **UNVERIFIED** until the next user publish |

Fresh file-only command, exit code 0:

```text
$ npx tsx scripts/check-migration-drift.ts --journal-only
Journal-only mode (no database connection).
Step 1/3: journal integrity check...
  ✓ 27 migration file(s), all journaled, no orphans.

✅ Journal is consistent with migrations/.
```

The pre-publish script still uses journal-only checks and skips browser checks
in publishing mode; it does not intentionally boot a server or create a scratch
database against production. Never set `REPLIT_DEPLOYMENT=1` in the workspace.
Do not delete evidence to address publishing image size.

## Deployment observation

The deployment service returned on 2026-09-16:

```json
{
  "success": true,
  "isDeployed": true,
  "primaryUrl": "https://awesome.video",
  "additionalUrls": ["https://awesome-list-site.replit.app"],
  "deploymentType": "autoscale",
  "hasSuccessfulBuild": true,
  "visibility": "public"
}
```

This confirms an active successful deployment, **not** that this candidate was
published. Deployment ID/time for this release: **none observed**. Explicit
user publishing action for this candidate: **not received**.

## Resume and post-publish verification

Resolve the independent review's handoffs without changing acceptance
thresholds, then complete the exact-candidate checklist above. Only then offer
Publish and wait for the user to publish through Replit.

After that user action, obtain fresh deployment metadata and record the actual
deployment ID/time, build-image outcome, boot-migration logs and errors.
All post-publish checks remain **PENDING / NOT RUN**:

- `npm run baseline:compare -- --target https://awesome.video` against the
  pre-work snapshot: every inventoried public route's status/redirect,
  title/canonical/robots, testid inventory (no removals), resource/category/tag
  counts and JSON-LD types; zero unexpected differences.
- Built-in browser tester, read-only visitor flow: submit requires sign-in,
  search yields results, category page 2 loads, missing route returns 404,
  and `/api/config` contact options are all unavailable.
- Production mobile Lighthouse on home/category/resource; axe home at 375
  and 1440; single canonical Google Fonts request and all families loaded;
  no console CSP violations; all 50 guest theme combinations persist.
- Read-only production schema and QA residue checks: resource `kind`,
  contact table, no `__qa_test_` rows. No production test accounts or writes.
- Admin AI health: router endpoint and successful connection, without exposing
  credentials. Keep any API cost or authorization limitations explicit.

Use only the authorized built-in browser tester/Screenshot and existing
registered automated gates. Preserve raw results and screenshot provenance.

## Rollback decision

**No rollback performed:** no release was initiated by this task. Leave the
currently serving deployment unchanged. Before publishing, confirm the prior
deployment is retained and available in Replit's publishing history. If
post-publish acceptance fails, stop and record the failure; request a rollback
through the publishing flow or hand off a fix, never hot-patch production.
An application rollback does not imply reversal of schema/data migrations.

`STATUS.md` deliberately remains BLOCKED; change it to “published and verified”
only after the actual release and every required verification pass.

## User-requested closeout — execution handoff

The user redirected this session to review the original design attachments,
produce one comprehensive main-session execution prompt, and close out.
That deliverable is `docs/parity/MAIN-SESSION-EXECUTION-PROMPT.md`. It supersedes
the earlier planning draft as the execution handoff.

This closes the session's documentation work, not the product acceptance or
release. No deployment was initiated. Required implementation, readiness and
post-publish verification remain outstanding; the release stays on HOLD and
`STATUS.md` remains BLOCKED. The main session must execute the prompt, verify
the real app in Replit's built-in browser, and wait for the user's Publish
action before verifying production.