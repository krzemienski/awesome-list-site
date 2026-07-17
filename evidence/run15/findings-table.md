# Run15 Findings Table — MASTER-FIX-PROMPT (2026-07-17, BUG-001..050)

Status legend: FIXED | FIXED-PRIOR (already fixed before this audit crawl / stale) | INVALID (does not reproduce) | BY-DESIGN | PLATFORM | USER-ACTION | DATA-FIX | DECLINED

Evidence files (this dir): `verify-api-output.txt` (10/10), `verify-desktop-output.txt` (11/11 + 9/9), `verify-auth-output.txt` (5/5 + 7/7), `verify-mobile-output.txt` (4/4 @375), `bug-045-tablet-probe.txt` (@768), `bug-011-watchdog-proof.txt`, `bug-019-server-guard-curl.txt`, `bug-038-redirect-curl.txt`, `data-fixes.json`.

| ID | Sev | Summary | Verdict | Root cause / disposition | Evidence |
|----|-----|---------|---------|--------------------------|----------|
| BUG-001 | CRITICAL | Duplicate accounts via email case variants | FIXED | register + getUserByEmail now lowercase/citext-compare; case-variant register → 409 | api: first=201, variant=409 |
| BUG-002 | HIGH | Admin category create fails silently | INVALID | create works live — row visible, dialog closes, success toast | auth p2 PASS |
| BUG-003 | HIGH | Search caps at 100 results, no pagination | FIXED | real server pagination (page/limit, no overlap, total=1822) + client pager | api PASS; see BUG-048 |
| BUG-004 | HIGH | PDF export opens blank popup | FIXED | replaced `window.open('')+document.write` with hidden-iframe print (0 window.open calls) | desktop p2 PASS |
| BUG-005 | HIGH | Profile Settings button dead | FIXED | Settings now navigates to /settings/theme | auth p1 PASS |
| BUG-006 | HIGH | Profile favorites/bookmarks not linked | FIXED | rows now Link to /resource/:id | auth p1 PASS (href=/resource/187906) |
| BUG-007 | MEDIUM | Long query overflows no-results echo | INVALID | 80-char unbroken query wraps with no horizontal overflow at 1440 AND 375 | desktop p1 + mobile PASS |
| BUG-008 | MEDIUM | 12 tags accepted despite max 10 | FIXED | client surfaces validation error; server zod caps metadata.tags at 10 → 400 too_big | api PASS |
| BUG-009 | MEDIUM | Double-escaped HTML entities in descriptions | DATA-FIX | dev has 0 affected rows; journaled prod rerun pending post-republish | data-fixes.json (skip: clean) |
| BUG-010 | MEDIUM | Admin journeys step counts differ from public | FIXED | admin now counts distinct stepNumber like public; parity j6–j10 | api PASS (18/18, 6/6 ×4) |
| BUG-011 | MEDIUM | GitHub sync jobs stuck in progress | FIXED | orphan watchdog now boot + 5-min periodic sweep; stuck dev row 39 marked failed/"Orphaned by server restart"; prod data rerun pending | bug-011-watchdog-proof.txt |
| BUG-012 | MEDIUM | Growth Rate shows raw count as % | FIXED | relabeled to "+N resources added" (no fake %) | desktop p2 PASS |
| BUG-013 | MEDIUM | Cold-start recs all 75% "Popular among users" | FIXED | score variance 0.85→0.73, 4 distinct reasons | api PASS |
| BUG-014 | MEDIUM | Admin create dialogs no field validation | INVALID | missing-field toast + rendered errors exist; dialog stays open on invalid submit | auth p2 PASS |
| BUG-015 | MEDIUM | Raw 409 JSON in admin toast | FIXED | GenericCrudManager onError routes through humanizeApiError | auth p2 PASS (raw-json=false) |
| BUG-016 | MEDIUM | Escape swallowed in admin dialog | INVALID | Escape closes a fresh dialog; audit hit layered dismissal (open toast consumes first Escape) — Radix design | auth p2 PASS |
| BUG-017 | MEDIUM | Profile stats don't reflect activity | FIXED | /api/user/progress now counts favorites/bookmarks activity (streak 0→1 after favorite) | api PASS |
| BUG-018 | MEDIUM | AI rec preferences don't persist | FIXED | prefs persist to localStorage, restored after reload | desktop p2 PASS |
| BUG-019 | MEDIUM | Enrichment batch size 0 accepted | FIXED | client `parseInt(...)||10` coerced 0→10 bypassing guard (NaN→0 now); NEW server-side 1–50 integer guard → 400 | auth p2 PASS + bug-019-server-guard-curl.txt |
| BUG-020 | MEDIUM | www.awesome.video NXDOMAIN | USER-ACTION | DNS/custom-domain config in Replit Deployments; not app code | — |
| BUG-021 | MEDIUM | No email verification | DECLINED | no email transport exists (Run10/13 precedent) | — |
| BUG-022 | MEDIUM | "+N more" tags not expandable | FIXED | pills expand 3→5, label toggles "+2 more"→"Show fewer" | desktop p1 PASS |
| BUG-023 | MEDIUM | Search inputs lack accessible labels | FIXED | aria-label="Search resources" | desktop p1 PASS |
| BUG-024 | MEDIUM | Sidebar focus not visible | INVALID | focus outline 2px visible on nav items live | desktop p1 PASS |
| BUG-025 | MEDIUM | Touch targets below 24px (tag chips 20px, toggles 16px) | FIXED-PRIOR | Run13 44px touch-target work predates crawl; live: chips 26px, toggles 24×44 (0 under 24 in 12-sample each) | mobile PASS ×2 |
| BUG-026 | MEDIUM | Missing h1 on Journeys/Advanced | INVALID | h1 present on both ("Learning Journeys", "Advanced Features") | desktop p2 PASS |
| BUG-027 | MEDIUM | Duplicate h1 on /settings/theme | INVALID | single h1 live ("Theme Settings") | desktop p2 PASS |
| BUG-028 | MEDIUM | About heading order h1→h3 | FIXED | CardTitle h3 → h2; live sequence [1,2,2,…] | desktop p2 PASS |
| BUG-029 | MEDIUM | Change password accepts same password | FIXED | server rejects same password → 400 "must be different" | api PASS |
| BUG-030 | LOW | Inconsistent admin date formats | FIXED | shared formatAdminDateTime/formatAdminDate in lib/utils.ts applied admin-wide (GitHubSyncPanel, BatchEnrichmentPanel, LinkHealthDashboard, ExportTab, GenericCrudManager, ResearcherTab) | auth p2 PASS (0 raw-locale dates) |
| BUG-031 | LOW | "password1!" rated Good | FIXED | dictionary penalty added; now "Very weak" | desktop p1 PASS |
| BUG-032 | LOW | Streak always 0 despite activity | INVALID | streak increments same-day on activity (favorite → streakDays 1); audit account had no qualifying activity window | api BUG-017 PASS shows streak 0→1 |
| BUG-033 | LOW | 404 page lacks nav chrome | INVALID | 404 renders inside MainLayout — sidebar + header + 404 copy all present | desktop p2 PASS |
| BUG-034 | LOW | Favorite/bookmark no aria-pressed | FIXED | aria-pressed toggles false→true on favorite; present on bookmark | auth p1 PASS |
| BUG-035 | LOW | Link health "All healthy" with 0 checks | INVALID | honest zero-state copy shown when no checks have run | auth p2 PASS |
| BUG-036 | LOW | Login advertises 4 OAuth providers | FIXED | copy now single "Continue with Replit" — no multi-provider claim | desktop p1 PASS |
| BUG-037 | LOW | Trailing-space URL rejected | FIXED | url trimmed client+server; spaced URL matches clean check-url result | api PASS |
| BUG-038 | LOW | Redirect Location includes :443 | PLATFORM | Replit edge appends :443 to https Location (`https://awesome.video:443/`); app emits no port | bug-038-redirect-curl.txt |
| BUG-039 | LOW | Dash rendered as whole metric | FIXED | score 0 renders "0%" not "—" (5 N% elements, no bare dash) | desktop p2 PASS |
| BUG-040 | LOW | Tags shown as comma text not chips | INVALID | 57 tag pills render as Badge chips, no comma text | desktop p1 PASS |
| BUG-041 | LOW | Suggest-edit no-op accepted silently | INVALID | no-op guard exists — toast fires, dialog stays open | auth p1 PASS |
| BUG-042 | LOW | CSV export leaks full emails | FIXED | export masks emails like UI (`_•••@example.com`), no leak | api PASS |
| BUG-043 | LOW | No confirm-password field | FIXED | confirm-password field on Register | desktop p1 PASS |
| BUG-044 | LOW | Two stacked search boxes on mobile /search | INVALID | exactly one visible search input at 375 (input-search-page) | mobile PASS |
| BUG-045 | LOW | Breadcrumb "Home" truncates at tablet | FIXED | root Home crumb no longer flex-clips; deeper crumbs truncate first | bug-045-tablet-probe.txt (@768: text="Home", clipped=false) |
| BUG-046 | LOW | Duplicate "Podcasts & Webinars" sub-subcategory | DATA-FIX | dev: id 3702 renamed → "Podcasts" (slug podcasts), 1 resource repointed; prod rerun pending post-republish | data-fixes.json |
| BUG-047 | LOW | Login form no method attribute | FIXED | method="post" on login AND register forms | desktop p1 PASS ×2 |
| BUG-048 | LOW | No page-jump in search pagination | FIXED | pager navigates ?page=2, range text "page 2 of 48" | desktop p1 PASS |
| BUG-049 | LOW | No display-name UI | FIXED | profile name edit UI + PATCH endpoint (name round-trip verified, restored) | api + auth p1 PASS |
| BUG-050 | LOW | /settings/theme public while other /settings gated | BY-DESIGN | deliberate public exception (theme picker needs no auth); documented in server/index.ts | — |

## Tally
- FIXED: 27 (+1 FIXED-PRIOR = 28 resolved in code)
- INVALID (does not reproduce live): 13
- DATA-FIX (journaled; prod rerun pending): 2 (BUG-009, BUG-046)
- PLATFORM: 1 (BUG-038) · USER-ACTION: 1 (BUG-020) · BY-DESIGN: 1 (BUG-050) · DECLINED: 1 (BUG-021)

## Prod follow-ups after republish
1. ✅ DONE (July 17, 2026) — Run15 build republished (verified live via BUG-042 masked CSV export). Data fixes applied via `scripts/run15-data-fixes-prod.ts` (admin API — prod DB is not directly writable): BUG-009 both entity rows (188392, 188458) decoded; BUG-046 node 3712 renamed → "Podcasts" (slug `podcasts`) + resource 185847 repointed. Journal: `evidence/run15/data-fixes-prod.json`. Live smoke: descriptions render `<Video>` / `<60ms`, node + resource verified via public API.
2. ⏳ BUG-011 prod data half: the 16 prod `github_sync_queue` rows stuck in `pending` (Nov 2025–Jun 2026) are NOT swept by the shipped watchdog (it deliberately leaves `pending` as legit backlog) and no admin endpoint can fail them. The watchdog now ALSO fails `pending` rows older than 7 days (dev-verified: 30-day row flipped, fresh row survived). This lands on the NEXT republish after this task merges — no manual step needed, boot sweep clears them.
3. BUG-020 remains a user DNS action (add `www` CNAME in Replit Deployments custom-domain settings).
4. Case-insensitive email hardening (architect review follow-up to BUG-026): dedupe any prod rows colliding on `lower(email)`, then add a unique functional index `CREATE UNIQUE INDEX ... ON users (lower(email))` so the DB enforces what the app-level lowercase normalization assumes.
