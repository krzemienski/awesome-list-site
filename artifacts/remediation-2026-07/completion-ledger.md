# Run19 Completion Ledger — Black-Box Audit Remediation (July 18, 2026)

Source report: `attached_assets/REPORT_1784366713776.md` (BUG-001..050).
Evidence per finding: `artifacts/remediation-2026-07/BUG-NNN/` (after-verification.json + screenshots/dumps).
All verification performed live against dev (http://localhost:5000) via Playwright (anon desktop@1440, mobile@375, authed admin) and psql/curl — no mocks (Iron Rule).

Legend:
- **fixed** — code change landed this run, re-repro proves the audit symptom gone.
- **fixed (code+data)** — code change plus data correction; dev data applied, prod re-run journaled.
- **data-fix** — data-only correction; dev applied, prod journaled in `scripts/run19-data-fixes-prod.ts`.
- **fixed-prior** — already fixed in an earlier run (prod was stale at audit time); re-verified live this run.

| Bug | Sev | Finding | Status | Resolution / evidence highlight |
|---|---|---|---|---|
| BUG-001 | HIGH | No SSR: empty shell, generic meta, ~2.7s blank | fixed | Early-fetch of /api/awesome-list from inline index.html script pre-bundle; og-middleware already serves per-route meta/JSON-LD to crawlers. Skeleton paints immediately (BUG-018). |
| BUG-002 | HIGH | Submit button disabled ~3.5s; sometimes never enables | fixed | Silent spinner removed; labeled auth-check states (verifying / error+Retry / login gate); bounded auth retry. |
| BUG-003 | HIGH | 16 duplicate sub-subcategory groups | fixed (code+data) | `scripts/run19-dedupe-subsubcats.ts` merged dups into canonical slugs (idempotent, re-run = no-op); admin create/rename now blocks case-insensitive dups. Dup groups: 0. |
| BUG-004 | MEDIUM | Breadcrumbs crush header search | fixed | Search trigger min-width floor; breadcrumb truncates instead. |
| BUG-005 | MEDIUM | Submit 400s shown as generic toast | fixed | `extractFieldErrors()` maps server fieldErrors onto react-hook-form field errors. |
| BUG-006 | MEDIUM | Sub-Subcats parents all "Unknown" | fixed (defensive) | Not reproducible; silent parent-fetch failure now surfaces alert+Retry, name-based fallback join. |
| BUG-007 | MEDIUM | Duplicate sub-subcat pages public + sitemap | fixed (code+data) | Shared root cause with BUG-003; dup slugs 410-tombstoned, sitemap regenerated (parity — BUG-048). |
| BUG-008 | MEDIUM | /admin tells signed-in non-admin to "sign in" | fixed | AdminGuard splits unauthenticated vs not-admin branches ("You don't have permission…"). |
| BUG-009 | MEDIUM | Users tab: names "—", emails identically masked | fixed (code+data) | Register stores firstName from email local part; masking keeps distinguishing chars; prod backfill journaled. |
| BUG-010 | MEDIUM | Users tab: no search/sort/pagination | fixed-prior | R2-M17 search + Run16 sorting + pagination; verified live (filter narrows to 1 row). |
| BUG-011 | MEDIUM | "Browse All Resources" links to home | fixed | /search with empty query = paginated full-catalog browse; CTA now targets /search. |
| BUG-012 | MEDIUM | Tag popover: 20 of 1,759 tags, no search | fixed | slice(0,20) cap removed; type-to-filter over full tag list. |
| BUG-013 | MEDIUM | 19 exact duplicate resource titles | fixed (code+data) | Submit rejects case-insensitive dup titles (409); `scripts/run19-retitle-dup-titles.ts` (case-insensitive) retitled all groups — dup groups now 0. |
| BUG-014 | MEDIUM | Edits Approve styled red like Reject | fixed | Approve uses affirmative green, matching Approvals tab. |
| BUG-015 | MEDIUM | "AI Analysis" never populated | fixed | Edit submission now kicks off background Claude analysis (nothing ever triggered it before). |
| BUG-016 | MEDIUM | Category card teaser unlabeled resource blurb | fixed | Teaser prefixed "Featured: <resource title> —". |
| BUG-017 | LOW | About claims "static generation" | fixed | About copy corrected to describe the SPA + server-rendered crawler meta honestly (about-1440.png). |
| BUG-018 | LOW | Blank dark page while data loads | fixed-prior | Skeleton shell verified on early load (home-early-load-1440.png). |
| BUG-019 | LOW | `<script>` search → 403 as "No results" | fixed-prior | Script query returns graceful no-results UI, no 403 (script-search-1440.png). |
| BUG-020 | LOW | Duplicate search API fetches | fixed-prior | One search API call per query observed (single request in network log). |
| BUG-021 | LOW | /admin soft-403 (200) | fixed-prior | Anon GET /admin → 302 → /login?next=%2Fadmin (admin-anon-headers.txt). |
| BUG-022 | LOW | /settings gated but /settings/theme public | fixed | `/settings` removed from server protectedPatterns (hub is links-only); anon 200 + breadcrumb round-trip verified. |
| BUG-023 | LOW | Only "/" shortcut exists | fixed-prior | ⌘K and / both open the palette (cmdk-open/slash-open screenshots). |
| BUG-024 | LOW | "Run Link Check" off-theme blue | fixed | Default themed Button; computed bg equals `bg-primary` rgb(255,61,82), no bg-blue-*. |
| BUG-025 | LOW | "Introduction & Learning" vs "Intro & Learning" | fixed (code+data) | Canonical DB name "Intro & Learning" everywhere (parser, Home, sidebar). |
| BUG-026 | LOW | Toasts overlap consent banner | fixed | Toast viewport offset above banner (toast-vs-consent-1440.png). |
| BUG-027 | LOW | Three date formats across UI | fixed | Shared medium format ("Jan 20, 2026") across resource/admin; journeys show no dates; admin sweep found only medium-format dates. |
| BUG-028 | LOW | Auth-gate toast vs modal inconsistency | fixed | Uniform sign-in toast for favorite/bookmark/suggest-edit (authgate-toasts-1440.png ×3). |
| BUG-029 | LOW | 404 breadcrumb title-cases raw slug | fixed | AppHeader knownFirstSegments → unknown routes crumb "Not found" (both 404 screenshots). |
| BUG-030 | LOW | Empty bordered panel under Edits | fixed | Live probe: emptyBorderedPanels=0 on Edits tab (admin-edits-1440.png). |
| BUG-031 | LOW | Same resource as steps 2 and 3 | fixed-prior | DB sweep: 0 duplicate (journey_id, resource_id) pairs. |
| BUG-032 | LOW | Journey resources mismatched/outdated | data-fix | Journey 6 steps 4–15 re-curated topic-matched; prod journaled. |
| BUG-033 | LOW | Journeys filter not in URL | fixed | ?category= synced + survives reload (journeys-filter-url-1440.png). |
| BUG-034 | LOW | Duplicate Visit controls; 1-item Quick Actions | fixed | Single "Visit" control, Quick Actions card removed (resource-page-1440.png). |
| BUG-035 | LOW | Two competing category search boxes | fixed | Single scoped search with category-scoped placeholder (category-scoped-search-1440.png). |
| BUG-036 | LOW | 291 identical boilerplate descriptions | fixed-prior | Dev sweep: boilerplate-template matches = 0 (run18 clear + run19 enrichment). |
| BUG-037 | LOW | 100 descriptions <30 chars | data-fix | `scripts/run19-enrich-short-descs.ts` (Claude) rewrote all 73 approved short stubs; prod journaled. |
| BUG-038 | LOW | "FFmpeg (FFmpeg)" title | fixed-prior | 0 matches; case-insensitive dup-title sweep also clean (run19 retitle). |
| BUG-039 | LOW | Pagination Prev/Next only | fixed | "Previous | Page 1 of 14 | Next" + "Showing 1–24 of 335" (category-pagination-1440.png). |
| BUG-040 | LOW | Approval dialog linkifies malformed URLs | fixed | `isSafeHttpUrl()` gate; malformed probe rendered as plain text "(not a valid URL)", zero anchors with bad href (live dialog probe, screenshot). |
| BUG-041 | LOW | Metrics "#1" at 0% engagement | fixed | Leaderboard shows honest empty state when no local activity; rankOneWithZeroPercent=false (metrics-leaderboard-1440.png). |
| BUG-042 | LOW | "AI recommendations" are keyword matches | fixed-prior | Honest "popular picks" copy anon, no AI badge (anon-recs-copy-1440.png). |
| BUG-043 | LOW | 74 Community & Events "Uncategorized" | data-fix | All 74 classified (35 Events & Conferences, 39 Community Groups); prod journaled. |
| BUG-044 | LOW | Internal "approved" badge on public pages | fixed | 0 approved-status badges on public resource pages (anon sweep). |
| BUG-045 | LOW | "likes" vs "Favorite" copy drift | fixed | Copy unified on "favorites" across resource page + metrics. |
| BUG-046 | LOW | GitHub tab "Healthy" beside 38 failed jobs | fixed-prior | Run16 BUG-015 surfacing verified live: "31 failed" destructive badge + failure alert with latest error; no "Healthy" text anywhere (admin-github-1440.png). |
| BUG-047 | LOW | Approvals badge stale until reload | fixed | Stats query polls every 30s + refetchOnWindowFocus; live probe observed the interval refetch (fetches 1→2 over 35s). |
| BUG-048 | LOW | Sitemap 96 of 100 sub-subcats | fixed-prior | Exact DB↔sitemap parity: 9 cat + 96 subcat + 26 subsubcat + 1822 resources + 5 journeys (post-dedup counts; sitemap-dev.xml). |
| BUG-049 | LOW | Bare counts without units | fixed | Sidebar counts read "N resources" with singular "1 resource"; badSingular=0 (sidebar-counts-1440.png). |
| BUG-050 | LOW | Action buttons lose labels at 375px | fixed | All 4 actions labeled (Favorite/Bookmark/Share/Suggest Edit), 44px targets, in-viewport, no horizontal overflow (resource-actions-375.png). |

## Totals (50 findings)
- fixed (code this run): 30
- fixed (code+data): 5 (BUG-003/007/009/013/025)
- data-fix only: 3 (BUG-032/037/043)
- fixed-prior, re-verified live this run: 12 (BUG-010/018/019/020/021/023/031/036/038/042/046/048)

## Prod follow-ups (after republish)
1. `npx tsx scripts/run19-data-fixes-prod.ts` — journaled data fixes (BUG-009/025/032/037/043 + retitle/dedupe reruns) via live admin API.
2. `npx tsx scripts/run19-retitle-dup-titles.ts` and `scripts/run19-dedupe-subsubcats.ts` against prod (idempotent).
3. QA teardown verified net-zero on dev: `__qa_test*` users/resources = 0; probe rows (resource 187106, edits 53–55) removed.
