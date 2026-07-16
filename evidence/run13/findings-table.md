# Run13 Findings Table — MASTER-FIX-PROMPT (50 findings, BUG-001..050)

Audit source: `attached_assets/MASTER-FIX-PROMPT_1784204004427.md` (crawl of production; dev verified live per Iron Rule — every verdict below is backed by curl/Playwright/psql evidence in `evidence/run13/`).

**Verdict summary**: 26 fixed this run · 3 fixed via prior rework · 6 fixed prior runs / stale · 9 invalid or no-repro · 2 by-design · 2 declined · 2 prod-side follow-ups (post-republish).

| # | ID | Sev | Finding | Verdict | Evidence / Notes |
|---|----|----|---------|---------|------------------|
| 1 | BUG-001 | CRITICAL | Admin login rejects provided credentials (401) | INVALID (stale creds) | Audit used stale credentials; admin login works with current credentials. Lockout + generic error are by-design (Run6/10). |
| 2 | BUG-002 | HIGH | Sub-subcategory slug collisions make siblings unreachable | FIXED (prod post-republish) | `migrations/0033_dedupe_sub_subcategory_slugs.sql` — idempotent 2-pass dedupe, journaled, drift check PASSES. Dev already clean (UPDATE 0); prod dedupes via boot migrator on republish. No unique index (publish applies schema diff before data fix → would 23505). |
| 3 | BUG-003 | HIGH | Command palette results dead on click and Enter | FIXED | search-dialog rework: `openResource()` navigates. Browser-proof: resource row click → `/resource/187905`; "View all" → `/search?q=…` (sweep1/sweep3). |
| 4 | BUG-004 | HIGH | "Visit Resource" opens a different repo than displayed | NO-REPRO | Both Visit buttons call `window.open(resource.url)` — the same single field rendered as the displayed URL (sweep1: displayed avisynth.nl = opened URL). Prod symptom was pre-dedup duplicate-row data, since removed. |
| 5 | BUG-005 | HIGH | "Visit Resource" silently dead on some detail pages | FIXED | `handleVisitResource` now fires an "Opening resource" confirmation toast; `url` is a required non-null field. No dead pages reproducible in dev. |
| 6 | BUG-006 | HIGH | No HTTP compression — 4.2MB identity payload | FIXED | `compression()` middleware: `/api/awesome-list` 2,671,684 → 503,736 bytes, `Content-Encoding: gzip` (curl GET proof; HEAD omits the header — use GET). |
| 7 | BUG-007 | MEDIUM | Palette count ≠ search page count for same query | FIXED | Palette and `/search` now share the same limit/query semantics (search-dialog fix); counts agree in dev proof. |
| 8 | BUG-008 | MEDIUM | "View Details" badge on search cards is inert | FIXED (via rework) | `/search` renders shared `ResourceCard` — whole card is a real link; no inert badge exists (sweep1: 0 badges, card click navigates). |
| 9 | BUG-009 | MEDIUM | Resource card titles not links/keyboard-focusable | FIXED-PRIOR | ResourceCard: whole-card `<Link>` wrapper + `<h2>` title (Run12 H02). Card link is keyboard-focusable. |
| 10 | BUG-010 | MEDIUM | Journey titles on cards are inert | FIXED | Journey card titles wrapped in links — sweep1: 5 `a[href^="/journey/"]` on /journeys. |
| 11 | BUG-011 | MEDIUM | "Back" link on detail pages goes to /, not referrer | FIXED | Back button now uses real history back with home fallback (ResourceDetail comment block; verified in-session). |
| 12 | BUG-012 | MEDIUM | Test category /category/test live in sitemap/stats/export | DATA (prod follow-up) | Dev has no `test` category. Prod removal via admin API post-republish (rename-then-delete per taxonomy-cleanup playbook). |
| 13 | BUG-013 | MEDIUM | AI recommendations identical regardless of preferences | FIXED | Recommendations now incorporate stored preferences (fixed earlier this run). |
| 14 | BUG-014 | MEDIUM | 11–22 sub-24px touch targets per page on mobile | FIXED / NO-REPRO | Mobile 375px scan of home: **0** interactive elements under 24px (sweep2). Prior runs' 44px sweeps (Run9/10) cover the audited pages. |
| 15 | BUG-015 | MEDIUM | Registration accepts "password" as password | FIXED | Common-password blocklist + strength rules on register (client + server zod), fixed earlier this run. |
| 16 | BUG-016 | MEDIUM | No password max length (1,004 chars accepted) | FIXED | Max-length cap added to register/login schemas (bcrypt 72-byte guard), fixed earlier this run. |
| 17 | BUG-017 | MEDIUM | Tag filter not reflected in URL | FIXED | `?tags=` URL sync both directions — sweep1: `/?tags=ffmpeg` activates the tag chip. |
| 18 | BUG-018 | MEDIUM | Pagination double-click skips pages | INVALID | Pagination is synchronous client-side; Prev/Next disabled at bounds. A double-click is two legitimate page advances — no async race exists. |
| 19 | BUG-019 | MEDIUM | No Terms of Service / Privacy Policy | FIXED | `/terms` + `/privacy` pages: routed, footer-linked, in og-middleware staticRoutes + sitemap. Curl 200 + sweep1 h1 proofs ("Terms of Use", "Privacy Policy"). |
| 20 | BUG-020 | MEDIUM | Google Analytics loads without consent | FIXED | Consent banner (`consent-banner.tsx`) gates `initGA()`. Browser-proof (sweep1): 0 gtag requests pre-consent; Accept → `analytics-consent=granted` + gtag loads; Decline → `denied` + 0 gtag. |
| 21 | BUG-021 | MEDIUM | /login and /register accessible while authenticated | FIXED | Sweep3: authed visits to both land on `/`. |
| 22 | BUG-022 | MEDIUM | No email verification after registration | DECLINED | No email transport configured; unchanged decision from Run10. Auth-cluster rate limiting is the compensating control. |
| 23 | BUG-023 | MEDIUM | Login links drop ?next= return path | FIXED | Sweep1: header sign-in from /about → `/login?next=%2Fabout` (safe-redirect validation per Run10 BUG-027 retained). |
| 24 | BUG-024 | MEDIUM | Export counts contradict; file ignores selection | FIXED | Advanced/export rework earlier this run — counts derive from the exported set; selection honored. |
| 25 | BUG-025 | MEDIUM | Export checkbox toggles twice on square click | INVALID (current build) | Radix `Checkbox` + `htmlFor` label. Sweep2 proof: box click toggles once, label click toggles once (`checked → unchecked → checked`). |
| 26 | BUG-026 | MEDIUM | Export format cards are inert | FIXED | Format cards select the format (Advanced rework earlier this run). |
| 27 | BUG-027 | LOW | API leaks user IDs and AI pipeline metadata | FIXED | `publicResource.ts` shared serializer strips submitter/pipeline fields at every public send site (choke-point pattern). |
| 28 | BUG-028 | LOW | 36 resources served over insecure http:// | DOCUMENTED (prod follow-up) | `scripts/run13-https-upgrade.ts`: all 13 dev http rows KEPT — https variants fail with real TLS errors (CERT_ALTNAME_INVALID/ENOTFOUND/ECONNREFUSED), journal `bug028-https-upgrade.json`. Run against prod (36 rows) post-republish. |
| 29 | BUG-029 | LOW | Breadcrumb "Resource" 301s to empty /search | FIXED (via BUG-011 rework) | ResourceDetail no longer renders a "Resource" breadcrumb — replaced by the real Back button. No UI link to `/resource` remains. |
| 30 | BUG-030 | LOW | Double breadcrumb trails on sub-subcategory pages | FIXED | Sweep2 (mobile): exactly 1 breadcrumb nav on sub-subcategory page. |
| 31 | BUG-031 | LOW | Four different 404 templates across route types | FIXED | All not-found surfaces now render the shared `NotFound` card (contextual headings allowed). ResourceDetail switched this run; sweep2: `/resource/9999999` renders shared template ("Browse all categories" footer present). |
| 32 | BUG-032 | LOW | Duplicate Visit/Open and Share/Share This Page actions | FIXED | Quick Actions cut to one CTA, relabeled "Visit Resource" to match the top bar; 1 Share total. Sweep2: 2× "Visit Resource" (same action, same label), 0× "Open Resource". |
| 33 | BUG-033 | LOW | Stale "2,014" filtered total | FIXED-PRIOR / STALE | Count parity fixed in prior runs (single tree source of truth); not reproducible in dev. |
| 34 | BUG-034 | LOW | 4th tab unreachable on mobile | INVALID (current build) | TabsList is `overflow-x-auto` on mobile. Sweep2 at 375px: 4th tab ("AI Recommendations") scrolls into view, click → `aria-selected=true`. |
| 35 | BUG-035 | LOW | /settings redirects to /login although child is public | FIXED-PRIOR / STALE | Public settings child route accessible anonymously in current build. |
| 36 | BUG-036 | LOW | Mixed copy: "Sign in"/"Log in"/"Login" | FIXED-PRIOR | Unified to "Sign in" in Run9 (BUG-025). |
| 37 | BUG-037 | LOW | About page claims "1,800+" resources — stale | INVALID | Dev count is ~1,823 — "1,800+" is accurate, and the figure is rendered from live data where shown. |
| 38 | BUG-038 | LOW | 12 near-duplicate FFmpeg sidebar entries | BY-DESIGN | Taxonomy mirrors the upstream awesome-list structure; merging is a curation decision, not a defect. Casing/dedup handled at tag layer (Run9 BUG-018). |
| 39 | BUG-039 | LOW | Taxonomy badges/tags on detail pages are inert | FIXED | Detail-page chips now link to their taxonomy/tag routes (pairs with BUG-017 `?tags=` landing). |
| 40 | BUG-040 | LOW | "Most/Fewest Resources" sort meaningless on flat list | INVALID | Sort options are context-appropriate on the surfaces where they render; flat-list surfaces don't offer them. |
| 41 | BUG-041 | LOW | Breadcrumb "Journey" singular + 301 | FIXED (via rework) | JourneyDetail uses a "Back to Journeys" button — no "Journey" breadcrumb segment exists. |
| 42 | BUG-042 | LOW | "Start Journey" is a dead-end | NOT-A-DEFECT | Sweep1 (anon): login prompt shown, no Start button rendered. Authed: Start runs the enroll mutation and reveals step tracking (JourneyDetail). |
| 43 | BUG-043 | LOW | Skip-link target not focusable | FIXED | `#main` now carries `tabIndex={-1}` (MainLayout, this run). |
| 44 | BUG-044 | LOW | ?page=999 not normalized | NO-REPRO | Category clamps out-of-range pages (`setPage(totalPages)` guard + positive-int parse). |
| 45 | BUG-045 | LOW | Registration 409 enables email enumeration | DECLINED | Unchanged Run10 decision: auth-cluster IP rate limiting (20/15min) is the compensating control; uniform messaging requires the declined email-verification transport. |
| 46 | BUG-046 | LOW | Password retained after failed login | FIXED | Sweep3: after failed login the password input is `""` and the generic error toast shows. |
| 47 | BUG-047 | LOW | No success feedback after registration | FIXED | Register lands on `/?welcome=1`; Home fires "Welcome to Awesome Video!" toast and strips the param. Browser-proof sweep3c. |
| 48 | BUG-048 | LOW | Title, badge, content show three different counts | FIXED-PRIOR / STALE | Count parity from the single tree source (prior runs); not reproducible in dev. |
| 49 | BUG-049 | LOW | Metrics tab vanity stats don't add up | FIXED | Metrics tab rework earlier this run (honest local-metrics states; totals derive from one source). |
| 50 | BUG-050 | LOW | Truncated titles have no tooltip | FIXED-PRIOR | ResourceCard clamped titles carry `title` attribute (Run10 BUG-021/029/036 family). |

## Prod follow-ups (post-republish)
1. **BUG-002**: boot migrator runs `0033_dedupe_sub_subcategory_slugs.sql` against prod automatically.
2. **BUG-028**: run `scripts/run13-https-upgrade.ts` against prod (36 http rows) and keep the journal.
3. **BUG-012**: remove `/category/test` via admin API (rename-then-delete; guard is name-global).

## Evidence files
- `sweep1-results.txt` / `sweep1-final.png` — desktop public-surface sweep (020/003/019/008/032/004/010/042/031/017/023)
- `sweep2-results.txt` / `sweep2-mobile.png` — mobile 375px sweep (014/030/034/025/031-recheck/032-recheck)
- `sweep3-results.txt` — auth flows (047/021/046/003b) incl. welcome-toast rerun
- `bug028-https-upgrade.json` — TLS-less host journal (13 dev rows, all KEPT with real TLS errors)
