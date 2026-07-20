# Run23 Final Gate — July 20, 2026

Spec: `attached_assets/MASTER-FIX-PROMPT-v2_1784528308962.md` (71 findings: R-01..R-14 + NB-001..058, NB-052 merged into NB-041). Per-finding verdicts: `fix-evidence-v2/completion-table.md`.

## 1. Static checks
- `npx tsc --noEmit` — clean (re-run after the NB-001 regression fix).
- `migration-drift` workflow — clean (no unjournaled schema drift).

## 2. Chunk-failure injection (NB-001 regression gate)
Routes injected (blocked lazy chunk via request interception): `/journeys`, `/search`, `/about`.
- **Regression found here first**: original fix used a one-shot boolean cleared on every error-free render; Suspense renders error-free *while the chunk is still fetching*, so the guard cleared instantly → **infinite reload loop** (8 navigations in 20s, proven pre-fix in `chunk-inject2.json` baseline).
- **Fix**: 60s-timestamp guard in `componentDidCatch` (`client/src/App.tsx`); no render-time clearing; the retry button stamps the guard rather than clearing it.
- **Post-fix, all 3 routes**: exactly 1 auto-reload → styled retry card rendered inside live app chrome (sidebar + header intact) → unblock + click Retry → route renders. 2 navigations/20s (1 initial + 1 guarded reload). Evidence: `chunk-inject2.json`, `inj2-*.png`.

## 3. P0 smoke — desktop@1440 + mobile@375 (`p0-smoke.json`, 14/14 PASS)
- Home renders category grid (`list-categories` anchors; home has no resource cards by design).
- Category page renders resource cards; card → `/resource/:id` → outbound link present with correct href.
- Search returns results and navigates to a resource.
- `/submit` logged-out gate (inputs disabled + login CTA).
- Zero horizontal overflow at both viewports; zero page errors across all routes visited.

## 4. Authed flows (`p0-auth.json`)
- Journey `/journey/7`: step toggle net-zero — `button-complete-step-1` → uncomplete visible → click → complete visible again. PASS.
- Admin `/admin?tab=approvals` renders the approvals surface. PASS.
- Zero page errors during authed pass.

## 5. Data-cluster live verification (`data-cluster.json`, details in per-finding dirs)
- Second run of `scripts/run23-data-fixes-prod.ts` against dev: fully no-op (idempotency proven).
- `/sub-subcategory/iostvos` → 301 → `/sub-subcategory/ios-tvos` (query string preserved); target 200, h1 "iOS/tvOS", 24 cards.
- 3 twin resources (185153/185466/184798) rejected → 404 live.
- 0 variant tag families; 0 null `approved_at`; tag-coverage endpoint `{total:1806, tagged:1047, untagged:759, 58%}`; anon → 401.

## 6. QA teardown
- Net-zero: `__qa_test%` = 0 across users/resources/journeys (leftover `__qa_test_run23_nb048` user purged; non-cascade FKs NULLed first).

## 7. Outstanding (post-republish)
- Republish required for all Run23 code fixes to reach prod.
- Then run `ADMIN_PASSWORD=… npx tsx scripts/run23-data-fixes-prod.ts` (live admin API; prod DB not agent-writable; validated end-to-end against dev via the same code path).
- R-14 remains a user registrar action (www DNS record).
