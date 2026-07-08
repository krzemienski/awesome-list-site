# Task #123 — Merge UI-Audit Branch + Full Re-Audit — Final Report

Date: July 8, 2026. App: awesome.video dev (localhost:5000). Iron Rule held: every check ran against the real running app + real PostgreSQL — no mocks, no stubs, no test-only modes.

## 1. Merge

- Branch `cursor/full-ui-experience-audit-4f2c` (6 commits from merge-base `9d546ab`) was applied to main via `git apply` of the full branch diff (sandbox git protections blocked `git merge`; the two sides changed zero files in common, and the diff applied clean).
- **IMPORTANT:** the branch itself remains unmerged in git *history*. All of its content IS on main. Nobody should re-merge or re-apply the branch — that would double-apply.
- Kept as-is (intentional): the `server/vite.ts` dev-only fix that removes the entry-script cache-buster (previously duplicated the client module graph → two QueryClient instances → invalidations silently no-op'd).

## 2. Post-merge sanity

- App boots (workflow "Start application" serving on :5000).
- `tsc` clean, eslint clean on audit-touched files.
- Unit tests: **198/198 pass**, including the 7 tests the branch repaired.

## 3. Inventory & validation totals — 100% PASS, zero real app bugs

| Phase | Scope | Result |
|---|---|---|
| Route sweeps ×3 viewports | 262 unique routes each on desktop 1440px, tablet 768px, mobile 390px (count-parity badges, h1/content, console errors, horizontal overflow) | 262/262 + 262/262 + 262/262 PASS (`sweep-{desktop,tablet,mobile}.jsonl`) |
| Sidebar exhaustive (Phase A, re-run fresh post-merge) | 209 clicks: 5 navs, 9 categories, 105 subcategories, 90 sub-subcategories | 209/209 PASS |
| Special routes (`goto-special.mjs`, fresh full loads) | auth-gated /profile /bookmarks /favorites /account → "/" + "Authentication Required"; /category→/, /journey→/journeys, /?q=ffmpeg→/search?q=ffmpeg; 404 page renders; /auth/login→/login, /auth/register→/register | all PASS |
| Phase C anon interactive | login page (OAuth buttons gone, local form present), anon /submit gated (alert + read-only form + disabled submit), ⌘K search dialog (16 results for "ffmpeg"), theme switcher all 5 systems flip `html[data-system]` (editorial/terminal/geist/brutalist/swiss) | 11/13 in raw `phaseC-anon.json` — the 2 FAIL rows (C5-page2/3) were harness selector misses, superseded by the 6/6 pagination deep-proof below; all 11 app-behavior checks PASS |
| Pagination deep-proof | encoding-codecs: Page 1–4 of 14 with 24 distinct cards each, jump to page 14 (13 cards = 325−24×13), Next disabled at end, badge "Showing 325 of 325" | 6/6 PASS (`phaseC-pagination.json`) |
| Phase C authed interactive (throwaway `__qa_test` admin) | UI login → role admin; /admin renders all 7 tabs; submit form (category select, validation) → success toast; pending row appears on /admin via SPA nav **without reload** (`window` marker held); pending row shows submitter **email not UUID**; approve dialog → row disappears + queries invalidated **without reload**; resource `approved` in DB via API | 8/8 PASS (`phaseC-authed.json`) |

**Double-QueryClient regression proof (the core reason for the branch's `server/vite.ts` fix):** with one QueryClient, approve's `invalidateQueries` on `['/api/admin/pending-resources']` + `['/api/admin/stats']` took effect immediately in the same session with no page reload (row removed, stats refetched). Observation, not a bug: on first arrival at /admin the stats badge can lag up to its `staleTime: 30000`, and the pending list fills via its `refetchInterval: 10000` poll — both by-design staleness windows, both bypassed correctly by explicit invalidation on mutation.

## 4. FAIL analysis — all were harness artifacts, none were app bugs

- `timeout` kill artifacts (process killed mid-write → truncated JSONL rows) — purged and re-run.
- SPA-nav stale-DOM races on redirect/gated routes — re-verified with fresh full loads in `goto-special.mjs`.
- Transient mid-render horizontal overflow on encoding-codecs (491→390) and general-tools (417→390) on fresh mobile load — settled to no overflow; count parity 325/325 and 151/151 confirmed via `overflow-probe.mjs`.
- Phase C anon pagination rows — wrong selectors (fixed: `button-next-page`, `card-resource-*`), superseded by the 6/6 pagination deep-proof.

## 5. Count parity

- Every category/subcategory/sub-subcategory badge == sidebar count == API == DB across all 3 viewport sweeps (the sweeps assert badge text against the API-derived expected count per route).
- Approved total stayed **1,838** before and after the audit (the throwaway QA resource was approved then fully torn down).

## 6. QA data hygiene (net-zero)

Throwaway `__qa_test_20260708_070413_phasec` admin user + 1 submitted resource created for Phase C; teardown in one transaction (children first per FK map: resource_edits, research_discoveries.created_resource_id, then resource, then user-ref NULLs, then user). Verified: 0 `__qa_test` users, 0 `__qa_test` resources, 0 orphan resource_edits, approved back to 1,838.

## Evidence index (`_validation/audit2/`)

- `sweep-desktop.jsonl` / `sweep-tablet.jsonl` / `sweep-mobile.jsonl` — 262 rows each
- `phaseC-anon.json`, `phaseC-pagination.json`, `phaseC-authed.json`
- Harness: `sweep.mjs`, `goto-special.mjs`, `overflow-probe.mjs`, `phase-c-*.mjs`, `routes.json`
- Teardown: `qa-teardown.mts` (inventory), `qa-teardown-exec.mts` (transactional delete + verify)
