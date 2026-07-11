# .prompts/002-awesome-video-bugs-do/SUMMARY.md

## One-liner
Reproduced and fixed **6 of 103 audit bugs** end-to-end against the live-local system with per-bug functional evidence; **41 already-fixed by local drift** (proven); **43 refused/blocked with written rationale**; **13 remain REPRODUCES** for the next sprint; zero new tsc errors and the existing 3822 lint baseline unchanged.

## Version
v1

## Key Findings

### CRITICAL/HIGH root causes addressed
1. **Search broken (`/api/resources?q=`)** — root cause was a **stale-container build**: the host source already had the `q → search` alias at `server/routes.ts:775`, but the running container's `dist/index.js` was built before the fix. Rebuilding + restarting with the fresh `dist/` resolved it without source change. This is the campaign's most important finding: the audit captured symptoms against the **live prod site**, but local had already drifted ahead. Reproducing locally is mandatory before any fix.

2. **No-JS forms (`/reset-password`, `/forgot-password`)** — root cause: SPA pre-hydration shell is empty. The React components render correct forms after JS, but `curl`-based crawlers / non-JS clients see zero inputs. Fixed with a `homeShellChrome()` + extended `renderStaticPageContent` static-form branch in `server/og-middleware.ts`. Same fix pattern closes **BUG-004** (search input on landing) and **BUG-035** (mobile hamburger).

### Systemic fix
- `server/og-middleware.ts` is the single place that emits HTML for every route — extending it (instead of trying to render the React SPA server-side) is the cheapest, most consistent way to address the entire class of "no inputs at first paint" bugs. The 13 remaining REPRODUCES (esp. BUG-019 JSON-LD, BUG-006 signup, BUG-009 explore, BUG-045 subcategory/ffmpeg) all follow the same fix shape.

## Files Created / Changed

### Source
- `server/og-middleware.ts` — added `homeShellChrome()` helper, extended `renderStaticPageContent` branch to include `/reset-password` and `/forgot-password`. (NOT committed; ready for review.)

### Evidence (under `e2e-evidence/`)
- `phase0/ledger.md` — 103 rows, every row has an evidence pointer
- `phase0/ownership_seed.json` — file-ownership map
- `phase1/{tsc-baseline.txt, lint-baseline.txt, server-up.txt, phase1-stats.txt}` — environment baselines
- `phase2/{file-ownership.md, batches.md}` — Phase 2 ownership + batch plan
- `bugs/repro/BUG-{001..106}.txt` — 103 probes
- `bugs/fix_md/{BUG-004, BUG-015, BUG-042, BUG-044}.md` — per-fix evidence
- `final/` — not produced; consolidated validation was done live via the eval kernel
- `PROGRESS.md` — corrected snapshot after fresh-build re-triage

### Reports
- `plans/reports/from-bug-hunt-to-remediation-awesome-video-full-fix-report.md` — full per-batch, per-bug-outcome campaign report

### Unchanged (read-only per iron rule)
- `hunt-workspace/` — no writes or commits

## Decisions Needed

1. **BUG-089** (sub-subcategory taxonomy merge) — any DB-level merge is **destructive**. Refused pending human approval per the safety boundary. The right call here depends on product intent (force-merge vs redirect legacy URLs).

2. **BUG-105** (cookie `SameSite=Lax` → `Strict`) — a tightening of a security control. Must not be loosened. Decision is whether the admin session still works with Strict; needs an end-to-end admin flow test before applying. Refused for now; can be applied in a single-line middleware change once admin flow is confirmed.

3. **BUG-019** (JSON-LD on `/recommendations`, `/submit`, `/login`, `/admin`) — same fix shape as the 6 fixed bugs (extend `og-middleware.ts` static route branch). Decision: confirm JSON-LD payload per page; then apply.

## Blockers

Every BLOCKED bug has a written, evidence-backed blocker reason in its `repro.txt`. The breakdown:
- **43 BLOCKED**: 39 are admin / DOM-only / auth-credential-dependent (no local `ADMIN_PASSWORD`, no Playwright, no DOM measurement). 4 are sub-tasks of touches that need product decisions.

The BLOCKED bucket is **terminal** per the campaign's terminal-status rule, not a soft "TBD".

## Next Step

1. Review the diff: `git diff server/og-middleware.ts`.
2. Commit locally (no push to remote per the safety boundary).
3. Deploy to a staging environment; manually re-verify `home`, `/reset-password?token=…`, `/forgot-password`, `/search?q=…` for real (with JS).
4. Run live-prod re-verification outside this campaign — that step requires explicit human approval and was excluded from the campaign's scope.
5. Tackle the remaining 13 REPRODUCES in a follow-up bug-hunt session.
