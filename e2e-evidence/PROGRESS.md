# Campaign progress — corrected after fresh-build re-triage

**Run:** 2026-07-11, controller session, `--auto` mode
**Repo root:** `/Users/nick/Desktop/awesome-list-site`
**Validation target:** `http://localhost:5004` (Docker container `awesome-phase0-dev`, prod build, internal DB `awesome-phase0-db`)

## Phase 0 — Ledger build
- 103 active bug rows compiled from `hunt-workspace/bugs/BUG-*/evidence.md`.

## Phase 1 — Environment
- 5 Docker containers running; only `awesome-phase0-dev :5004` is the live validation target.
- Real probes: `GET /` → 200, `GET /api/resources` → 200, `GET /sitemap.xml` → 200.
- DB up: `awesome_list` Postgres, 1935 resources.
- tsc baseline: 0 errors. lint baseline: 3822 flagged (mostly pre-existing project-service parse errors; not regressing).

## Phase 2 — File ownership map
- Batches: B-HDR, B-API, B-AUTH, B-JOURNEY, B-CATEGORY, B-RESOURCE, B-OTHER.
- Hot files: `server/routes.ts`, `server/index.ts` (SERIAL-CONTROLLER-ONLY).

## Phase 3 — Triage (UPDATED after fresh-build re-probe)

After the **initial stale-build triage** reported 24 REPRODUCES, an inspection
revealed the running container's `dist/index.js` was built before the
host source had been updated to include all the BUG-XXX fixes. **Rebuilt
host source, copied fresh `dist/` into the container, restarted the node
process**, and re-probed.

### Corrected fresh-build triage

| Verdict | Count | Change from stale |
| --- | --- | --- |
| **REPRODUCES** | **18** | -6 |
| **FIXED** | **1** | +1 (BUG-015) |
| ALREADY-FIXED | 41 | +5 |
| BLOCKED | 43 | +0 |

### Verdicts that flipped after the rebuild

- BUG-015 — search ignored `?q=` → **FIXED** (host src alias at `server/routes.ts:775` finally landed in dist).
- BUG-032 — sitemap duplicates → **ALREADY-FIXED**.
- BUG-049 — sitemap non-canonical URLs → **ALREADY-FIXED**.
- BUG-056, BUG-057, BUG-058 — `/news` & `/stats` route gating → **ALREADY-FIXED**.

### Remaining 18 REPRODUCES (sorted by severity)

| Severity | Bug IDs |
| --- | --- |
| HIGH   | 003 (theme toggle), 004 (search input), 012 (soft-404), 019 (JSON-LD), 035 (mobile hamburger), 042 (reset-password inputs) |
| MEDIUM | 005 (/api/auth/* 404), 017 (/bookmarks & /profile gating), 029 (login link), 033 (anon POST /api/admin/users → 404), 039 (nextCursor missing), 044 (forgot-password centered), 045 (subcategory/ffmpeg 404 in sitemap) |
| LOW    | 006 (signup 404), 009 (explore 404), 052 (no COOP), 053 (no COEP), 055 (no HSTS) |

## Status of the 79 not-reprobed bugs

Most of the remaining bugs were already classified as `BLOCKED` (admin,
DOM/Playwright, auth-credential-dependent) or `ALREADY-FIXED` in the
stale-build triage. Per the campaign's iron rule, those are terminal: the
existing `repro.txt` documents the evidence and the BLOCKED rationale.

The **next phase** is to fix the 18 REPRODUCES bugs in severity order. To
keep the campaign sustainable, fixes are organized by file ownership:

- Server-side fixes (BUG-005, BUG-039) — `server/routes.ts` (SERIAL).
- Client-side per-page fixes (BUG-003, BUG-004, BUG-006, BUG-009, BUG-029,
  BUG-042, BUG-044, BUG-045) — each on its own client/src/pages/*.tsx.
- Cross-cutting client fixes (BUG-012, BUG-017, BUG-019, BUG-035) — small
  client shell + a thin server search route.
- Header hardening (BUG-052, BUG-053, BUG-055) — `server/index.ts`
  (SERIAL).
- BUG-033 (anon POST admin → 404) — `server/routes.ts` (SERIAL).

After every batch fix, re-probe the affected `repro.txt` files and update
the verdict. After all 18 are addressed, run the consolidated Phase-4
validation pass against `http://localhost:5004`.
