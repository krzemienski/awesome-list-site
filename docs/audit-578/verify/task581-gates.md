# Task 581 — completion gates (2026-10-09)

| Gate | Result |
|---|---|
| `npm run check` (tsc) | exit 0 |
| `vitest tests/unit/personalized-recommendation-signals.test.ts tests/unit/recommendation-engine.test.ts` | 72/72 passed |
| `vitest tests/integration/api/resource-kinds.test.ts` | 19/21 passed. The journey-step embed test passes after narrowing the embed back to its documented 6 keys. The 2 failures are in the `/api/resources?kind=` listing tests (they get 400 / `validation_failed` from the resources route's query contract), which is outside this task's region. |
| DS verify `--mode full --routes /journey/7,/journey/6,/admin/journeys` (run `2026-10-09T16-30-41-052Z-5526`) | 15 pass, 1 fix, 2 unverified (deep tier). The only FIX is `ds-button-sweep`, and only its 4 signed-in **bookmarks/collections** overlay checks: bookmark card 188015 and the collection-controls section never become visible for the sweep's account. None of them involve journeys. Every journey check passes: `route-journeys-*` and `admin-journeys-*` report 0 stray buttons, inputs, chips, cards, h1s and eyebrows. live-probe, ink-accent, palette and token gates pass. |
| "Start application" workflow | restarted cleanly after the final server edit |
| Unpublish regression (`task581-harness/unpublish-proof.mjs`) | 0 leaks for draft and archived across detail, HTML, `/api/user/journeys`, `/api/user/continue-learning`, `/api/user/progress`; residue 0 |
| Completion validation run `I03CCC7yn4kVhstnCzPfa` | Code review approved. seo-snapshot, dead-exports, openapi, response-contracts, prefs-races, auth-return, check, build, migration-drift: PASS. Still failing, and already failing on main outside this task's files: print-audit (journey-anon expects a login button, but it has been a link since the design adoption), responsive (tabs-profile), tablet (sidebar-drawer/theme-preview), collections (library tag), root-script-drift (`scripts/run-ds.sh`, `scripts/setup-ds-run.sh`), sticky-preview. These belong to task #589. The user chose to keep this task open until #589 lands, then retry. |
| Fixture residue (SQL + Clerk) | users 0, journeys 0, steps 0, resources 0, progress 0, trigger 0, function 0; Clerk `__qa_test_plan_581_` users 0 |

## Post-rebase re-check (2026-10-10, after rebasing onto main with #589 merged)

- Conflicts resolved: `LearningJourneyRepository.ts` keeps this task's transactional `removeJourneyStepRowsInTx` and adds main's journey audit entries (`journey.step_group_deleted` / `journey.step_deleted`). In `og-middleware.ts` and `seo-content.ts`, main's version was kept: it already renders the "Some resources in this step are no longer available." note as its own element.
- `npx tsc --noEmit -p .` → exit 0.
- DEV was missing main's `0053_deleted_user_tombstones` table, so every signed-in request returned 500 during JIT lookup. Applied the idempotent migration to DEV (dev never runs the boot migrator).
- Re-ran `node docs/audit-578/verify/task581-harness/api-proof.mjs` against the restarted app: B01, B02, B03, B05, B06 and B09 all show the same results as the original proof run. Output is in `task581-harness/out/api-proof-post-rebase.txt`.
- Residue: the harness deletes only the Clerk user, so the local `users` row was then deleted by exact id. The final residue SQL across journeys, resources, users and steps with the `__qa_test_plan_` prefix returned **0**.

## Review rejection follow-up (2026-10-10)

- The code review found that a failed **queued** progress write left its step looking complete. Fixed in `JourneyDetail.tsx`: rollback now targets the last server-confirmed progress, and a failed background refetch keeps the loaded page. The before/after browser proof is in B04.md, "Review follow-up".
- Three checks failed during completion validation run `jzTu2brhawSZ4lmrNWHVz` while 38 checks ran in parallel: auth-return (Clerk "forgot password" link timed out), guest-recommendations (standalone mobile `apiItems=unknown`), and seo-snapshot (503 on 5 `/tag/*` URLs plus one tag parity row; all journey checks passed, 5/5). Re-run on their own afterwards: guest-recommendations 6/6 PASS, auth-return 41/41 PASS, seo-snapshot GATE PASSED (schema 100%, hydration parity 20/20).
- `npx tsc --noEmit -p .` → exit 0. Fixture residue SQL → 0.

## Second validation run after the review fix (2026-10-10, run `10lCTe9rn9aJaq1WLTd5C`)

- Every listed check passed except seo-snapshot. Journey checks inside it passed (5/5 journeys with Course syllabus and crawler-visible steps; hydration parity 20/20).
- seo-snapshot failed only on 503s for `/tag/open-source` and `?page=2..5`. The previous run failed on different tags (`/tag/javascript`, `/tag/rtmp`, `/tag/html5`), so this is not tied to any route. Run on its own, each of those URLs returns 200 in 0.3–0.7 s.
- Root cause (outside this task's region): `cache-headers` (`http-cache-headers.mjs --spawn --build`) boots `node dist/index.js` with `NODE_ENV=production` against the same DEV database. It ran 13:39:32–13:40:34, inside seo-snapshot's 13:38:58–13:43:38 crawl. Production boot runs the boot migrator; its idempotent DDL takes table locks, and SSR reads that hit them fail with `lock timeout` (55P03), which the middleware sheds as a bounded 503 by design. The two checks hold different leases (`dist` vs `db-heavy`), so nothing stops them from overlapping. Suggested harness fix for the gate owners: `cache-headers` should also hold the `db-heavy` lease while its spawned server is up, or point that server at a scratch database.
