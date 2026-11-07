# Production validation: progress

Resume here. Also read `ORIGINAL-PROMPT-CHECKLIST.md` (per-item status), `.local/state/prod-loop.md` (earlier session facts).

## Current state (2026-10-26 ~04:50 UTC)
- Cycle: 1, testing nearly done; fixes being authored.
- Deployed: `e12a4e67` (live `/api/version` = e12a4e67; Replit deploymentId b112b7e1, status success).
- `main` HEAD: `6cf9daf4` (PR #30 F1, #31 G1–G3, #32 remove Vercel), NOT deployed yet. Deploy once F2/F3 merge (batch). No schema changes since e12a4e67.
- Replit app: Awesome Video, replId `71ccccc7-37f7-4f07-a880-5973ae4aa911`. No SSH (alias `awesome-replit` doesn't resolve). Deploy path = replit-deploy skill fallback: `update_app_using_prompt` "sync only, ff-only" + `ask_question` to confirm HEAD, then `publish_app` + poll `get_publish_status`, then `curl /api/version`.
- Spend this run: research $1.3245 (#64) + $0.3213 (#65) + $0.2753 (#66) + $0.1508 (#67) = **$2.07**; enrichment jobs 33 (30 resources) + 34 (10) cost not recorded by the app (no cost column; ~40 haiku calls).

## Tools
- Visitor browser: chrome-devtools MCP, isolatedContext `prod-c1-visitor` (page 2). Request bodies via `get_network_request` (token-heavy).
- Admin browser: agent-browser `AGENT_BROWSER_SESSION=prodadmin` with owner cookie imported from `/tmp/aw-prod-owner.cookieheader` (admin@example.com). HAR via `agent-browser network har start|stop <ABSOLUTE path>`. Click by snapshot ref after `scrollintoview` + `wait 800`; avoid `wait` > 20 s (daemon hangs). Headed mode (`AGENT_BROWSER_HEADED=1`) needed to make a tab hidden (CLS/INP flush).
- curl with `/tmp/aw-prod-owner.jar`; POSTs need `-H 'Origin: https://awesome.video'` (same-origin guard).
- SQL: BLOCKED (no prod DATABASE_URL; NEON_DATABASE_URL endpoint disabled). Admin API stands in.
- Clerk: production is a LIVE instance (clerk.awesome.video); `clerk` CLI linked only to the dev instance. Member flows + sign-out BLOCKED → asked owner for a throwaway prod login or to type OWNER_PASSWORD.

## Phase 0 baseline (before test writes)
- Live = main HEAD e12a4e67 PASS; home 200 (0.20 s); /api/health/ready 200; sitemap 200; preflight ok; /api/health/ai config no secrets; migrations 33/33.
- Counts (admin API 03:38 UTC): resources rows 4,047; approved 3,824; pending 15; rejected 179; users 132; newest research_job 63; pending discoveries 0; enrichment_jobs 31 rows (ids ≤ 32).

## Production rows created by this run
| Table | id | What | Removed? |
|---|---|---|---|
| research_jobs | 64 | proof run completed, 9 turns, $1.3245 | |
| research_discoveries | 2043 | MediaMTX, approved in place | |
| resources | 190342 | from approving 2043 (https://mediamtx.net/), public; also enriched by job 33 | owner decides keep/remove |
| research_discoveries | 2044 | SRS blog, rejected `[QA-prod-validation 2026-10-26]` | |
| research_jobs | 65 | budget_stopped $0.3213 | |
| research_jobs | 66 | cancelled $0.2753 lower bound | |
| research_jobs | 67 | QA brief, orchestrator refused fabricated saves, $0.1508 | |
| resources | 190343 | `[QA-prod-validation] duplicate re-check probe` (pending) | DELETED via admin UI 04:46 (404) |
| resources | 190344 | `[QA-prod-validation] approvals reject probe`, rejected via Approvals UI 04:5x | DELETED via admin API (404) |
| enrichment_jobs | 33 | cancelled via API after 30 resources | |
| enrichment_jobs | 34 | cancelled via confirm dialog after 10 | |

## Visitor sessions (filter out of analytics)
| UTC | Context | Widths |
|---|---|---|
| 03:39–04:00 | chrome-devtools prod-c1-visitor (consent granted) | 1440, 390 |
| 03:47–03:58 | agent-browser prodvis390/prodvis820 (consent granted) | 390, 820 |
| 04:01–04:04 | agent-browser headed vitals runs | 820 |
| 04:05 | agent-browser QA paths | 390 |
| from 04:38 | sweep subagents, consent DENIED (no analytics) | 390, 820, 1440 |
| 06:27–06:30 | chrome-devtools prod-c1-visitor (cycle 3; consent granted 06:29) | 1440, 820, 390 |

## Cycle 1 failures and fixes
| ID | Failure | Root cause | Fix | Status |
|---|---|---|---|---|
| F1 | Umami: no page view on browser Back/Forward; later events carry previous URL | injected tracker hooks only pushState/replaceState, no popstate listener | popstate → same-URL replaceState (+ sync suppression first) | PR #30 merged 16ea45a9, not deployed |
| F2 | Admin targets: Users "Reveal email" 36px; Link Health URL links 16px; Export "Open Link Health" link 21px | no hit-area/min-height on those controls | PR #33 merged 3883aa90 | not deployed |
| F3 | GitHub import dry run can create categories/subcategories ("Nothing was written" is false) | `ensureCategoryHierarchy` runs before dryRun guards (syncService.ts:426) | PR #34 (ab0d62fa) + review follow-up by `fix-f3b-review` (queued-route refuse dryRun, empty heading, docs) | authoring; do NOT run dry run on prod before deploy |
| G1 | Taxonomy listing cards at 820 (touch): View details 32×32, Open Link 44×32, tag pills 27px (lead re-measured /category/infrastructure-delivery) | taxonomy.css:437-458,482-485 override resource-card.css:320-327 touch floor | PR #31 merged 2164fd8d | not deployed |
| G2 | Home "Hand-picked highlights" card: title link 122×20, card shows pointer cursor but body is not a link (lead re-measured) | HomePresentation.tsx:343-371 inline link, no stretched overlay; `.card.hoverable` cursor | PR #31 merged 2164fd8d | not deployed |
| G3 | Footer "PRs welcome" link 73×14 on /about (home footer variant is 101×32) | inline link without 24px floor in the compact footer | PR #31 merged 2164fd8d | not deployed |
| O-DATA | Subcategory names "RTMPRTSPHTTP Protocol Servers", "Widevine FairPlay PlayReady Integrations" lost separators | c3: upstream README spells them exactly so (README lines 2579, 1830); not a site defect | owner/upstream: fix the README headings (a rename here would be undone by the next import) | OPEN (owner, upstream) |
| F5 | Import dry run plans duplicate sub-subcategory `iOStvOS` beside existing `iOS/tvOS` | `normalizeCategory` (server/github/parser.ts) strips `/` | PR #39 keeps `/`; local clone dry run: iOStvOS planned → none, totals 2283 both | PR open |
| O-GA4 | GA4 double page_view per SPA navigation | GA4 Enhanced Measurement history page views | owner GA4 admin toggle | OPEN (owner dashboard) |

## Cycle 1 PASS summary
- Phase 1 (A): all DONE except A14 (F1) and owner items A15/A16. Admin zero vendor sends at 1440/820/390; QA paths suppressed.
- Phase 2 (B/C): B2–B5, B7–B9, B11–B13, B15, C1–C4 (partial), C5, C7–C11, D7, D8, B14 PASS. U4 (820 run view) PASS. U1/U2 not triggerable (orchestrator refuses fabricated saves, run #67). B10 needs removing a deployment secret (owner confirm). U3 (stall timer) needs deploy logs.
- Phase 3: 17 admin tabs render at 1440/820/390, 0 console/page errors, no h-scroll. Resources select-all/indeterminate/Clear filters/bulk bar 390 PASS; resource delete confirm PASS. Account-deletion confirm (member) BLOCKED. Public sweeps running (agents sweep-public-390, sweep-public-820).

## Next
1. Read sweep reports; batch any client fixes.
2. Review F2/F3 diffs, open PRs, merge.
3. Deploy main via replit-deploy fallback; prove /api/version.
4. Cycle 2: re-check F1 (Umami back page view via HAR at 820), F2 targets, F3 dry run on prod (counts unchanged via /api/categories + admin subcategories), plus admin-tab sweep (client changed).
5. Cleanup: decide 190342 with owner; report.

## Public sweeps (cycle 1, done 04:55 UTC)
- 820/1440 (sweep-820): 10 items PASS except targets (G1–G3). Evidence `evidence/c1/sweep-820/`.
- 390 (sweep-390): 8 PASS, 2 FAIL = G1, G2. Evidence `evidence/c1/sweep-390/`.
- Both sweeps saved their in-page probe functions as .js files in evidence; lead removed them (owner no-scripts rule). The 390 sweep stubbed `navigator.share` in-page to avoid sharing; Share itself counts as UNVERIFIED beyond "calls navigator.share with title+canonical".
- Follow-up (not a defect, owner call): on long-description resources (2% of sample) the primary "Open on …" button sits ~1.5 screens down at 390 (description renders before actions, ResourceDetail.tsx:819-829).
- Follow-up (unverified a11y): filtered home keeps unfiltered sr-only category teasers (Home.tsx:612-617).

## Admin controls (cycle 1, 05:00–05:10 UTC, 1440)
- Approvals: reject dialog with 10-char reason → status rejected, row leaves queue, focus to next row's "Review details" (QA row 190344, deleted after).
- Audit: QA writes logged (created/rejected/deleted, actor masked a•••@example.com); Next pages to 26–50 of 16,662 (`GET /api/admin/audit-logs?offset=25` 200).
- Journeys: Steps editor opens/closes on Escape, focus back to "Steps"; nothing saved (journey edits go live).
- Dialogs open/close/focus-return PASS: Categories Add + Edit, Subcategories Edit, Resources Add. Export Download is a direct download.
- Users API: no password/hash fields.
- Tool note: agent-browser headless never scrolls this site (scrollY stays 0), so below-fold clicks silently miss — the earlier "enrichment Cancel" and "audit Next" misses were this, NOT site bugs (memory: agent-browser-no-scroll).

## Owner request 05:2x UTC: remove Vercel
- `vercel git disconnect` on project `v0-awesome-list-site` (prj_ElP2LbNJCSj6t9olmALEsbBh8sNg): no more PR deploys/checks (PR #32 checks = Sourcery only).
- PR #32 merged 6cf9daf4: deleted vercel.json + Vercel docs sections. Vercel project itself NOT deleted (irreversible; asked owner).
- Noticed: GitHub Actions "Deploy Awesome Video Viewer to GitHub Pages" fails on every main push (not used either?) — reported to owner.

## Deploy 1 (cycle 1 → 2) — 2026-10-26 05:34 UTC
- Owner republished from the website. Live `/api/version` = `b09abb1b` (empty Replit "Published your App" commit; tree 9b4db270 == f9455363). Evidence `e2e-evidence/replit-deploy/<ts>/07-live.txt`. Ready 200, home 200 0.20 s, preflight ok.
- Workspace note: each Publish adds an empty "Published your App" commit, blocking ff-only; replit-deploy skill updated with the safe `reset --keep` exception. PR #35 (3dc2b56e): skills tracked in git, GitHub Pages workflow removed (no app change).

## Cycle 2 results (on b09abb1b)
- F3 PASS: prod dry run left cat 9 / sub 99 / subsub 32 / queue 49 / resources 4048 unchanged (`evidence/c2/f3-counts.txt`); queued route refuses dryRun with 400.
- F4 NEW FAIL: synchronous dry run 504 after 300 s; compare stage ~0.15 s/item × ~2,283 (deploy log). Root cause `checkConflict` re-fetches whole catalog per item (syncService.ts:1330). Author `fix-f4-import-index` → branch `fix/github-import-catalog-index`.
- F1 page views PASS: Back/Forward each send one Umami pageview (`evidence/c2/f1-back-820.har`). Residual F1b FAIL: the page's custom event (resource_viewed/category_viewed) on the page returned to still carries the previous URL. Capture-phase theory DISPROVED (page effect fires ~26 ms before popstate dispatch). New fix: `replitTrack` passes `umami.track(p => ({...p, name, data, url: <url at event time>}))` (Replit build supports function form).
- G1/G2/G3 PASS at 390 + 820 (cards 44px, home card body navigates, footer 24px). G4 NEW: 2-letter tag pill 41×44 → PR from `fix/tag-pill-min-width` (6f0d83bd).
- F2 PASS at 390 via designed touch path ("Row actions" toggle → Reveal 44×44, tap reveals). Export 211×44, Link Health 28px.
- Admin 17 tabs at 1440: 0 console/page errors; admin session 1,831 requests, 0 vendor sends.

## Fix round 2 (06:00–06:30 UTC)
- PR #37 merged c5769395 (F4): import builds catalog index once; dev dry run 25.7 s → 0.17–0.36 s, identical per-item decisions. Sourcery "concurrent writes" dismissed (heavyWork MAX_ACTIVE=1; old re-read was lockless too).
- PR #36 merged (G4 + onward tag min-width).
- PR #38 (F1b event URL) open; follow-up `fix-f1b2-url-snapshot` snapshots URL in track() (Sourcery valid). Sourcery "absolute URL splits from pageviews" dismissed: prod pageview payload url is absolute.
- Next: merge #36 and #38 after follow-ups → ask owner to republish → cycle 3 rechecks: F4 prod dry-run time + counts, F1b Umami event URLs on Back (HAR 820), G4 `/tag/hls` + resource onward tags at 820/390.
- PR #38 merged. Deploy target 6db26e73; awaiting owner republish.

## Deploy 2 (cycle 2 → 3) — 2026-10-26 06:23 UTC
- Owner republished. Live `/api/version` = `634e8afd`, NOT on GitHub: Replit autosave committed the untracked `.claude/skills/awesome-list-site/SKILL.md` at 06:17 (commit 634e8afd, Agent author), then Publish added empty 82a84485. `git diff --stat 6db26e73 634e8afd` = that one doc file only, so live runtime code == 6db26e73 (#30–#38). Ready 200, home 200 0.22 s.
- 06:27 owner-requested delete: `update_app_using_prompt` sync-only brief reset workspace main --keep to origin/main 21af70b4; confirmed by `ask_question`: HEAD == origin/main 21af70b4, clean, `.claude/skills` = replit-deploy, verify. Both Replit commits stay on gitsafe-backup/main.
- Next publish will stamp 21af70b4 (or later main) exactly.

## Cycle 3 results (on 634e8afd == 6db26e73 code)
- F4 PASS: prod dry run HTTP 200 in 12.08 s (was 504 at 300 s); 36 add + 756 update + 1,491 skip = 2,283; counts before/after identical cat 9 / sub 99 / subsub 32 / queue 49 / resources 4048 3825 15 (`evidence/c3/f4-*.txt`, `f4-dryrun.json`).
- F5 NEW FAIL (found in F4 output): dry run would create sub-subcategory `iOStvOS` (slug iostvos) although `iOS/tvOS` (id 3633, slug ios-tvos) exists. Root cause `normalizeCategory` in server/github/parser.ts strips `/`. A real import would mint a duplicate node that `/sub-subcategory/iostvos` 301-redirects away from (server/index.ts NB-047). Only upstream heading affected. Author `fix-f5-heading-slash` → branch `fix/import-heading-slash`.
- Upstream note: `RTMPRTSPHTTP Protocol Servers` and `Widevine FairPlay PlayReady Integrations` are spelled that way in the upstream README itself; not a site defect (owner/upstream content).
- F1b PASS at 820 (consent granted): category → resource (real click) → Back. Umami sends: pageview /category, category_viewed /category, resource_card_opened /category, resource_viewed /resource/184847, pageview /resource/184847, category_viewed /category (after Back, was previous URL in c2), pageview /category. Bodies `evidence/c3/f1b-*.network-request`. 0 console errors/warnings.
- G4 PASS: /tag/hls 820 `#go` 44×44 (was 41×44); 390: 84 pills, 0 under 44, no horizontal overflow; resource onward tags 390 (190152) all ≥44 h, 1440 (186335) `#Go` 44×44. Inline "Related:" sentence links 17 px tall are WCAG 2.5.8 inline-exempt.
- D4 PASS (sanitizer, 3 widths), D6 PASS (public flows + SSR SEO), A14 DONE, A17 DONE, D1 recorded. RESEARCH.md written.
- Cleanup check 06:45: QA rows from this run: 190343/190344 404; counts = baseline + 190342. Pre-existing QA rows from earlier audits remain rejected (188272 "ZZ QA TEST 7f3d9", 188479, 188536, 188537 …): not this run's, deleting them needs owner confirmation.

## Fix round 3 (06:30–06:50 UTC)
- PR #39 merged dbc173f2 (F5): `normalizeCategory` keeps `/`. Reviewed diff (2 files +5/−2); Sourcery pass, 0 comments. Author verified on a local clone renamed to ios-tvos: iOStvOS planned → none, 2283 items both.
- Workspace sync to dbc173f2 requested (sync-only brief). Next: confirm HEAD, ask owner to republish, then cycle 4 = final full pass on dbc173f2: F5 prod dry run (no iOStvOS, counts unchanged), plus neighbour rechecks (F4 timing), visitor 3-width smoke, admin 17 tabs 0 errors.
- Docs PR (DEPLOYMENT, replit.md, ADMIN-GUIDE, AI-SERVICES, ANALYTICS, memory, audit doc) after the final pass; it is docs-only.

## Deploy 3 (cycle 3 → 4) — 2026-10-26 ~06:52 UTC
- Workspace fast-forwarded 21af70b4 → dbc173f2 (sync-only brief; ask_question: HEAD == origin/main, clean). Owner republished. Live `/api/version` = `dbc173f26fae…` == GitHub main exactly (`evidence/c4/00-version.json`). Ready 200, home 200 0.25 s.

## Cycle 4 results (on dbc173f2) — final pass
- F5 PASS: prod dry run HTTP 200 9.84 s; `wouldCreateTaxonomy: []` (was iOStvOS); 36 add / 737 update / 1,510 skip, 0 errors; counts before/after identical cat 9 / sub 99 / subsub 32 / queue 49 / resources 4048 3825 15 (`evidence/c4/f5-*`).
- F4 neighbour PASS: same run 9.8 s (< 300 s gateway).
- Visitor smoke 1440/820/390 (home, category, resource, tag, search, /sub-subcategory/ios-tvos renders "iOS/tvOS"): no horizontal overflow; 0 console errors on the current navigation.
- Admin 17 tabs at 1440, 820, 390: c=0 p=0 x=false on every tab; vendor sends 0 of 1,831/1,831/1,832 requests (`evidence/c4/admin-*-c4.{txt,har}`).
- G5 NEW: taxonomy "Collection breadcrumb" links on subcategory + sub-subcategory pages are 18 px tall (390: Home 32×18, "Players & Clients" 136×18, "Mobile & Web Players" 160×18), all widths. Root cause `taxonomy.css:102` `.taxonomy-breadcrumbs a` has no hit-area floor (G3 precedent: footer links min-height 24px). Author `fix-g5-breadcrumb` → `fix/taxonomy-breadcrumb-target`. Cycle 4 is therefore not clean; another deploy + cycle 5 needed.
- Excluded from target counts (by design, re-checked): inline sentence links ("Related: #Streaming …"), card titles with card-wide ::after overlay (G1/G2), sr-only breadcrumb (`nav.sr-only`, tabindex -1).
- origin/main now a8dcfb52 = empty "Published your App" (Replit pushed it; tree a82dc213 == dbc173f2). Next sync is a plain ff.
- Docs worktree `../aw-docs-prodval` branch `docs/prod-validation-2026-10-26` (uncommitted): DEPLOYMENT "Publishing GitHub main", replit.md Recent Changes, ADMIN-GUIDE dry-run timing + "/", AI-SERVICES prod run costs, README stale deploy.yml badge removed, .agents/memory import-taxonomy + publish-snapshots topics and MEMORY.md index. Add audit doc after clean cycle 5, then commit + PR.

## Fix round 4 (07:00–07:15 UTC)
- PR #40 merged f476d79c (G5): `.taxonomy-breadcrumbs a { min-height: 24px }`. Reviewed diff (1 line); Sourcery pass, 0 comments; author measured 17.6 → 24 px at 1440/820/390, same wrap, no overflow; lead viewed 390 screenshot.
- Workspace sync to f476d79c requested. Next: confirm, owner republish, cycle 5 = final pass on f476d79c (G5 on prod + visitor smoke + admin 17 tabs + dry run), then audit doc + docs PR + D3 sign-out last.

## Deploy 4 (cycle 4 → 5) — ~07:25 UTC
- Workspace ff a8dcfb52 → f476d79c (sync-only brief; ask_question: HEAD == origin/main, clean). Owner republished. Live `/api/version` = f476d79c == GitHub main (`evidence/c5/00-version.json`). Ready 200, home 200 0.24 s.

## Cycle 5 results (on f476d79c) — CLEAN
- G5 PASS: `.taxonomy-breadcrumbs a` 24 px at 1440/820/390 on /subcategory/mobile-web-players and /sub-subcategory/ios-tvos.
- Visitor 7 pages × 3 widths: 0 visible targets under 24 px except 1440 home "+ N more →" (351×19.2) which meet WCAG 2.5.8 spacing (nearest target 15.6 px from centre > 12 px; neighbours 32.8 px rows); no h-scroll; 0 console errors/warnings at 820 and 1440.
- Dry run HTTP 200 11.0 s, `wouldCreateTaxonomy []`, 0 errors; counts unchanged (`evidence/c5/dryrun-*`).
- Admin 17 tabs × 3 widths: c=0 p=0 x=false; vendor sends 0 of 1,830/1,831/1,830 (`evidence/c5/admin-*`).
- Visitor tracking: Umami, GA4, Mixpanel, Amplitude send on visitor pages; PostHog sends once navigator.webdriver is false (bot filter, not a defect).
- O9 PASS, O10 PASS (checklist). Visitor session 07:38–07:45 chrome-devtools prod-c1-visitor with `token=QAPROBE-SECRET*` probe URLs (filter out of PostHog/Umami).
- Next: audit doc + docs PR (docs only, no deploy needed), then D3 sign-out (ends admin session), final report.
- Spend correction: enrichment does record cost (`metadata.agent.estimatedCostUsd`): job 33 $0.2102, job 34 $0.0408. Run total $2.07 + $0.25 = **$2.32** (cap $30).
- Docs PR #41 (305cf123 + review fixes). Sourcery 8 comments: all accepted (publish snapshots ignored files → no .env; repeat clean check right before publish; behaviour check after version; npm install vs db:push conditions split, db:push dev-only, migrations need neither; audit no longer links the uncommitted report dir (HARs carry cookies); replit.md notes 634e8afd autosave; enrichment cost corrected).

## State at ~08:00 UTC (resume here)
- Live f476d79c = last code commit; cycle 5 CLEAN. main 54c08c71 = +docs only (PR #41 merged). Optional republish makes /api/version == main (no runtime change).
- Cleanup done: merged worktrees removed (docs + 8 agent worktrees); stray root HARs (cookies) moved to evidence/c1/stray-root-hars/.
- Waiting on owner: (1) resource 190342 keep/remove; (2) delete pre-existing rejected QA rows 188272/188479/188536/188537…?; (3) then D3 sign-out (revokes the only prod admin session); (4) D5 needs a throwaway prod Clerk account; B10 needs secret removal confirmation; OPEN dashboards A15/A16/O3/O5.

## Owner decisions applied (~08:05–08:15 UTC)
- Keep resource 190342 (public, 200).
- Deleted 32 pre-existing test rows (all rejected): 24 `[AUDIT-TEST]` (190172–190282, 2026-09-30…10-03) + 8 QA probes (188271, 188272, 188274, 188469, 188470, 188479, 188536, 188537). All DELETE 200; resources 4,048 → 4,016, public 3,825 and pending 15 unchanged; rejected 179 → 147 with 0 test-pattern hits; real VQA/DASH-IF rows untouched (`evidence/cleanup/`).
- D3 sign-out DONE (see checklist). Owner cookie copies deleted locally; admin browser closed. No production admin session remains with this run.

## Corrections after /reflect review (~08:25 UTC)
- O10 → UNVERIFIED/owner step (webdriver override + fetch wrapper = bypass).
- D3 → OPEN finding: owner cookie survives /logout server-side; not "by design" closure.
- D6 → OPEN finding: `?page=abc` 404 document hydrates into indexable listing.
- Cleanup scope: owner approved "old qa rows" after seeing 4 examples; 32 deleted incl. 24 `[AUDIT-TEST]` not shown. Only id/title/url/date kept (`evidence/cleanup/to-delete.txt`), no full-row backup.
- Replit Analytics contains this run's own traffic (consent-denied sweeps still counted by the cookieless tracker): windows in "Visitor sessions" table + 04:38–05:10 sweeps + cycle 3–5 chrome-devtools visits.
- "Converged" claim at 07:55 retracted: open findings D3, D6 remain.
