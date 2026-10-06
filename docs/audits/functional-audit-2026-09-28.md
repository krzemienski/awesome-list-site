# Full functional audit after the pixel-parity fixes (branch `ds-consensus-gate`)

Date: 2026-09-28/29. App: dev server `http://127.0.0.1:5000`, real PostgreSQL data, real Clerk.
Method: `.agents/skills/full-functional-audit` + `.agents/skills/awesome-video-site-audit` (Iron Rule — real browser, real HTTP, real DB; no mocks, fixtures or intercepted routes). Four independent validators, each with its own Chromium and evidence directory; signed-in and admin flows used disposable `__qa_test_` identities torn down Clerk-first, local row second.

## Summary

| Domain | Items | PASS | FAIL |
|---|---:|---:|---:|
| HTTP API (188 route registrations, anonymous + authenticated + invalid-input + SEO) | 267 | 267 | 0 |
| Visitor journeys (1440×900 and 375×667) | 303 | 303 | 0 |
| Signed-in user journeys (both viewports) | 52 | 52 | 0 |
| Administration area (every tab, dialogs, own-record CRUD; both viewports) | 41 | 40 | 1 |
| **Total** | **663** | **662** | **1** |

Regressions from this branch: **0**. The one FAIL is pre-existing (the responsible files are untouched by this branch) and is reported as a follow-up, per the task scope.

## Finding

**FA-576-01 · MEDIUM · pre-existing — category slug auto-generation keeps `_`, then the same form rejects it.**
- Repro: `/admin` → Categories → Add category (or Edit) → type a name containing `_` (e.g. `my_category`). The slug field auto-fills with `my_category`; Save shows "Slug may only contain lowercase letters, numbers, and hyphens". Reproduced at 1440×900 and 375×667.
- Cause: the shared `slugify()` keeps word characters (`[^\w-]` strip, and `\w` includes `_`) — `client/src/lib/utils.ts:25`; the form's generator delegates to it (`client/src/components/admin/GenericCrudManager.tsx:2451`) while its validator requires `^[a-z0-9]+(?:-[a-z0-9]+)*$` (`:2115`).
- Acceptance: an auto-generated category slug always passes the form's own validation without manual correction.
- Why not fixed here: `slugify` is shared app-wide, and this task only fixes regressions from this branch. Filed as an owner follow-up.

## Coverage notes (not counted as tested)
- API: four public write endpoints were inventoried but not invoked because their side effects cannot be undone by the auditor.
- Admin: imports, GitHub export/sync, bulk actions, scans, link checks, seeding and mutations of existing records were deliberately not executed; queues that were empty had no safe record to open.
- Signed-in: the sign-in-and-return check used a real pre-authenticated Clerk session for the hand-off (no password typed); bulk-library and notification controls were exercised at one viewport each.

## Evidence (workspace only, never committed)
`.cache/functional-audit-576/{api,public-browse,signed-in-user,admin}/VERDICT.md` with screenshots and JSON probes (139 PNGs). Teardown: every validator confirmed its disposable users deleted (Clerk and local) and all created bookmarks, collections, submissions and categories removed; the post-run sweep (`npm run test:parity -- --sweep`) reported `remaining: []`, `clerkRemaining: []`.

## Found during production re-verification (fixed under Task #575)
- **Admin overview activity feed, 375 px:** after the audit, the live activity log held long actions ("recommendation feedback restored"). The row's action and time were `nowrap`, so the row overflowed and the list became a horizontal scroll region with nothing focusable in it (axe `scrollable-region-focusable`, serious). Fixed in `602a9b77` to match the reference layout: action and time shrink and wrap, and only the target truncates. Now list `scrollWidth == clientWidth` at 375 and 1440, and the production deep run's `parity-systems` gate passes.

## Final state
`npm run check` and `npm run build` exit 0 on `602a9b77`. The production deep DS run (`.cache/verify-ds/2026-09-29T00-42-57-095Z-16444`) printed FIX with pixel-parity as the only failing gate: 25/182 documented residual rows, 0 new. Consensus panel prod13 on the production build: 3/3 PASS on all 11 stages. `__qa_test_` sweep: Clerk 0, local 0.
