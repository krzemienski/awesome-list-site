# Run17 findings table — BUG-001..063 (July 17, 2026)

Source audit: `attached_assets/MASTER-FIX-PROMPT_1784308214696.md` (black-box crawl of prod awesome.video, 2026-07-17, pre-republish).
Triage rationale per finding: `evidence/run17/triage.md`.

Verdicts: **FIXED** (code fix this run, live-verified) · **FIXED-PRIOR** (already fixed in dev — prod stale when audited) ·
**DATA-FIX** (dev applied via `scripts/run17-data-fixes-prod.ts`; prod journaled for post-republish run) ·
**INVALID** (did not reproduce) · **BY-DESIGN** · **PLATFORM** · **PARTIAL**.

## Tally
- FIXED: 39 · FIXED-PRIOR: 10 · DATA-FIX: 6 · BY-DESIGN: 2 · INVALID: 2 · PLATFORM: 2 (one shared with a PARTIAL app-side fix) · PARTIAL: 1 · Sub-verdict note on 006 (platform + app-side fix landed).

## CRITICAL / HIGH
| ID | Verdict | Fix / evidence |
|---|---|---|
| BUG-001 | FIXED | Pending-approvals table no longer clipped by fixed-height ScrollArea; horizontal scroller present, View/Approve/Reject reachable per row. Live: `sweep-c4-submit.json` (tableW=1036, scrollerClientW=1006, actionsReachable=true). |
| BUG-002 | FIXED-PRIOR | Audit-tab resource filter wired (run16 BUG-041/084); prod was stale at audit time. |
| BUG-003 | FIXED | Journey progress counts group-aware: stepCount and completedStepCount both count logical steps (rows sharing a stepNumber = one step). Verified via authed /api/journeys. |
| BUG-004 | DATA-FIX | Journey 8 rows pointing at dead medium.com dupes (186146/186147) deleted; dev applied (`data-fixes-dev.json`: row 213 removed, 14 rows remain), prod via `scripts/run17-data-fixes-prod.ts` after republish. |
| BUG-005 | FIXED | Global focus-visible outline for sidebar/cards/nav (was scattered per-component). Live keyboard probe PASS. |
| BUG-006 | PLATFORM + FIXED (app side) | Cloudflare 403 on replit.com/oidc is infra. App-side: `/login?error=oauth` now surfaces a destructive toast and strips the param; dev curl proof of 3 failure shapes. |

## MEDIUM
| ID | Verdict | Fix / evidence |
|---|---|---|
| BUG-007 | FIXED-PRIOR | Admin stat cards pre-set status filter (run16 BUG-075). |
| BUG-008 | FIXED-PRIOR | Admin dashboard popstate/hashchange tab sync already present. |
| BUG-009 | BY-DESIGN | Masked CSV export is the run16 BUG-089 PII policy (server masks at export). |
| BUG-010 | FIXED | Audit log real pagination (1–50 → 51–100 of 3,239 live, `sweep-c2-admin.json`). |
| BUG-011 | FIXED | Profile name form: empty/max-length validation. Live verified. |
| BUG-012 | FIXED | Same surface — header truncation handled. |
| BUG-013 | FIXED | Remove-bookmark toast has Undo (sweep B2 PASS). |
| BUG-014 | FIXED | Profile tabs: wrap on small screens, grid from md up — no overlap/clipping at 375/768/1440 (sweep B2 PASS). |
| BUG-015 | FIXED | Home applies `?sort=` on fresh load (count-desc: 323→80 sorted, count-asc reverse — live probe PASS). |
| BUG-016 | FIXED | Journey step completion marks ALL rows of a logical step, so completedAt fires (grouped-rows shape). |
| BUG-017 | FIXED | About page uses semantic h2 sections. |
| BUG-018 | FIXED-PRIOR + verified | Submit URL zod https-only; live inline error "Must be a valid HTTPS URL" / "Please enter a valid URL" + aria-invalid (`sweep-c4-submit.json`). |
| BUG-019 | FIXED-PRIOR + verified | Max-10 tags enforced; live: "At most 10 tags allowed — remove some tags". |
| BUG-020 | FIXED-PRIOR + verified | Logged-out /submit: login-required alert, read-only disabled fieldset, disabled submit — no stuck loader (`sweep-c5-recs.json`). |
| BUG-021 | INVALID | `/search?q=<script>` → 200 ×3 from this datacenter IP; 403 was a WAF/edge artifact, not app behavior. |
| BUG-022 | FIXED-PRIOR + verified | Submit Cancel: dirty-state confirm ("Discard your unsaved submission?") then navigates home. |
| BUG-023 | FIXED | Breadcrumb collapses middle crumbs to an ellipsis below lg; verified at 768/820/900 (min text 39px) and full trail at 1024+ (`bug023-crumbs.json`). |
| BUG-024 | FIXED | Taxonomy hydration: SPA nav renders category 364ms / subcategory 281ms (target ≤1500ms) after skeleton + cache work. SSR out of scope (forbidden Vite changes). |
| BUG-025 | FIXED-PRIOR | Category + Subcategory share ResourceCard. |
| BUG-026 | DATA-FIX (prod-only) | Placeholder "A tool or resource for …" descriptions: 0 in dev; prod (~65) swept + cleared to "" by the run17 script (ResourceCard omits empty descriptions). |

## LOW
| ID | Verdict | Fix / evidence |
|---|---|---|
| BUG-027 | FIXED | Link-health re-check has busy state; live: "Checked — still no pending resources." (`sweep-c2-admin.json`). |
| BUG-028 | FIXED | Resource manager subtitle honest under filters: "0 of 1,991 resources match your filters". |
| BUG-029 | FIXED-PRIOR | Enrichment jobs render completed/cancelled/failed status badges honestly. |
| BUG-030 | FIXED | Link-health empty state uses one consistent label: "Run Check Now". |
| BUG-031 | FIXED | Failed GitHub sync rows: retry badge (×3) + failure guidance surfaced (`sweep-c2-admin.json`). |
| BUG-032 | FIXED | Category manager shows in-table "No categories match your search." row. |
| BUG-033 | FIXED | Resources table swipe hint + overflow container at mobile ("Swipe the table sideways…"). |
| BUG-034 | FIXED | Page-size select `shrink-0` — no longer flex-crushed (was 86px → 112px, clipped:false live). |
| BUG-035 | BY-DESIGN | Public tree = admin count (99=99); `-scNNNN` slugs kept for slug stability (run16 BUG-054 precedent). |
| BUG-036 | FIXED | Enrichment cost copy matches history: "$2.50–$27". |
| BUG-037 | FIXED | Journey button icons intact at 768 (sweep B2 PASS). |
| BUG-038 | FIXED | Search `?page=` restore + tab deep-links (sweep B2 PASS). |
| BUG-039 | FIXED | No journey dups; scores always render N% (sweep B2 PASS). |
| BUG-040 | FIXED | Tags render as chips (sweep B2 PASS). |
| BUG-041 | FIXED-PRIOR + verified | "Not Helpful" feedback buttons flex-wrap; live at 375: unclipped, right edge 193px < 375 (`bug041-profile.json`). |
| BUG-042 | FIXED | Register blur validation (onTouched) live (sweep B2 PASS). |
| BUG-043 | FIXED | Zero-preference recommendations use honest copy — "popular picks from across the catalog. Set preferences above for personalized results." — no "selected specifically for your learning journey" claim (`sweep-c5-recs.json`). |
| BUG-044 | FIXED | Stale "1,800+" counts refreshed to "2,300+" in metas/noscript; About's "1,800 stars" is a GitHub-stars floor (accurate, kept). |
| BUG-045 | FIXED | Guest browse link, rfc8216bis retitle, tablet crumb intact (sweep B2 PASS). |
| BUG-046 | FIXED | Journeys card shows Start Journey (no "Continue at 0%") until real progress exists (`sweep-c3-public.json`). |
| BUG-047 | DATA-FIX | Journey 8 title "FFMPEG Mastery" → "FFmpeg Mastery"; dev applied + live API verified, prod via script. |
| BUG-048 | FIXED | Crumbs/inline targets ≥24px at 375 (sweep B2 PASS). |
| BUG-049 | FIXED | Register/native attrs + autocomplete (sweep B2 PASS). |
| BUG-050 | PLATFORM | GAESA edge cookie is set by Google front-end infra (run16 BUG-092), not app code. |
| BUG-051 | FIXED | Duplicate HSTS resolved: app copy dropped, platform header remains single. |
| BUG-052 | FIXED | Back/Forward restore saved scroll position (scrollY map per history entry, `history.scrollRestoration='manual'`). |
| BUG-053 | PARTIAL | `?limit` clamped (max 100, both envs); negative `page` handling verified — remaining looseness journaled, no data exposure. |
| BUG-054 | FIXED | Origin-mismatch rejection on mutating routes (CSRF hardening; token flow intentionally avoided to keep prod journal scripts working). Post-review hardening: default ports (`:443`/`:80`) stripped before host compare (run15 BUG-038 edge behavior) + fallback allowlist reads `PUBLIC_SITE_URL` (canonical server var). Live probes: no-Origin/same-origin/`awesome.video`/`awesome.video:443` all pass; `evil.example` + `Origin: null` → 403. |
| BUG-055 | FIXED | /favorites route renders the proper page live (URL scheme consistency verified). |
| BUG-056 | INVALID | sportsvideo.org returns 200 with a browser UA from this IP — curl-UA bot-block, not link rot. |
| BUG-057 | DATA-FIX | Resource 186159 truncated description ("…hosting compe") completed; dev applied + API verified (tail "…rtualized production workflow."), prod via script. |
| BUG-058 | FIXED | "Edit in Admin" anchor/button nesting corrected; no dup 404 fetch. |
| BUG-059 | FIXED | Category header count follows the active filter. |
| BUG-060 | FIXED | Uncategorized/General labeling consistent (advanced URL state). |
| BUG-061 | DATA-FIX | 185850 title → "Awesome Smart TV" (dev applied); prod description ":zap:" shortcode stripped by script; bonus: 185907 → "TV Subtitle Extraction". |
| BUG-062 | DATA-FIX | Journey 8 duplicates: dead medium rows removed (see 004); VCT sourceforge mirror (185466) removed by script where both mirrors present (prod). Twitch Part I/Part 2 are distinct articles — kept. |
| BUG-063 | FIXED | index.html noscript/meta counts now "2,300+". |

## Validation gate (Iron Rule — real system, no mocks)
- `tsc --noEmit` clean (exit 0).
- `migration-drift` workflow: ✅ no drift (7 migrations reproduce shared/schema.ts).
- P0 smoke 12/12 PASS — desktop@1440 + mobile@375 (home, category, resource detail, search, login, zero page errors): `p0-smoke.txt`.
- Data fixes validated end-to-end against dev through the same admin-API code path the prod run will use: `data-fixes-dev.json`.
- QA teardown net-zero: users/resources/journeys `__qa_test*` = 0; pending resources = 0 (probe 187104 deleted post-verification).

## Prod follow-ups (after republish)
1. `ADMIN_PASSWORD=… npx tsx scripts/run17-data-fixes-prod.ts` — applies BUG-004/026/047/057/061/062 via the live admin API (prod DB not agent-writable); journals to `evidence/run17/data-fixes-prod.json`. Idempotent — re-runs are no-ops.
2. Re-run one GitHub export from the admin sync panel (run16 carry-over) so `github_sync_history` records a completed export.
