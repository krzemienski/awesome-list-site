# Full UI Experience Audit — Cycle 01 Report

Run date: 2026-08-18/19 · Mode: team · Threshold: zero open CRITICAL/HIGH/MEDIUM + 1 clean confirmation pass · Cycle 1 of max 10

## Executive summary

Phases 2-3 produced 27 findings (0 critical, 2 high, 16 medium, 9 low).
Phase 4 closed every one of them: 20 fixed (code, data, or infra), 3 closed by design, 4 closed as not reproduced against the live system.
**Open findings remaining: 0.**

## Status counts (source of truth: findings.json)

| Status | Count |
|---|---|
| closed-by-design | 3 |
| fixed | 20 |
| closed-not-reproduced | 4 |
| **total** | **27** |

## Fixed findings

| ID | Severity | Title | Commit |
|---|---|---|---|
| F004 | MEDIUM | clampSeoTitle brand-suffix budget collides distinct resources into identical serialized titles (9 URLs, 3 clusters) | a8ef90b1 |
| F005 | MEDIUM | Twitch transmuxing pair + Medium mirrors put the distinguishing "Part N" at char 64+, unclampable under any SERP budget | 7ee568c5 |
| F006 | LOW | Stored resource URL carries tracking parameters (resource 185760) | 7ee568c5 |
| F007 | LOW | Verbose [COLD-START DEBUG] console logging runs in production | bd773ccb |
| F008 | HIGH | Tag slug/title mis-singularized: '#video analysis' links to /tag/video-analysi and renders h1 'Video Analysi' (wrong data shown on public SEO page) | c0e247cb |
| F009 | HIGH | Cookie consent banner overlays and blocks the sign-up 'Continue' button (P0 account-creation CTA unclickable on first visit) | 8058378d |
| F011 | MEDIUM | Resource 'Resource details' panel displays literal 'Unknown' for Provider/Format/Skill level, and the same 'Unknown' leaks into the crawlable SEO description | 8058378d |
| F012 | MEDIUM | Category filter facets offer only an 'Unknown 333' chip for Provider/Format/Skill level — a confusing dead-end filter that doesn't narrow results | 8058378d |
| F013 | MEDIUM | Public-collection 'not found' state is a dead end (no in-card recovery action) | 8058378d |
| F014 | MEDIUM | Breadcrumb shows 'Home > Not found' on the sign-up and sign-in pages | 8058378d |
| F015 | MEDIUM | Journeys index: primary 'Start Journey' CTA buttons are 36px tall on mobile (below ~40px touch target) | 8058378d |
| F016 | MEDIUM | Resources admin table has no error state — a failed fetch leaves an empty table with no message or retry | 8058378d |
| F017 | MEDIUM | Admin tab strip touch targets are 32px tall on mobile (below ~40px), and 16 tabs wrap into a 222px-tall block | 8058378d |
| F018 | LOW | 'Related Resources' block title is not a semantic heading (h2–h4), reducing screen-reader landmark/discoverability | 8058378d |
| F019 | LOW | Escape key does nothing in the search input (no clear/blur) | 8058378d |
| F020 | LOW | Inconsistent number formatting: Advanced stat card shows '1816' where sidebar shows '1,816' | 8058378d |
| F021 | LOW | document.title briefly flashes 'Page Not Found' on guarded /notifications and /onboarding before AuthGuard redirect resolves | c578e561 |
| F022 | MEDIUM | Duplicate-URL on admin resource create returns 500 Internal Server Error instead of an explicit 409/duplicate message | 93fb2258 |
| F023 | MEDIUM | Malformed percent-escape in path returns HTTP 500 on /api/resources/:id (and /related); singular alias correctly returns 404 | da4abce4 |
| F027 | MEDIUM | Deep tag-page prerenders returned 503 under sustained crawler concurrency (pg pool acquire timeouts surfaced as bounded dependency failures) | c578e561 + 8434806e + 7ee568c5 |

## Closed by design

- **F001** (LOW) — Dead registration: GET /api/search is registered but no frontend caller (client search uses GET /api/resources with a search param): Deliberate public API aliases; code comments at server/routes/domains/catalog-contributions.ts:410-417 document /api/search and singular /api/resource/:id as intentional compat surfaces.
- **F002** (LOW) — Dead registration: legacy admin approval endpoints (GET /api/resources/pending, PUT /api/resources/:id/approve, PUT /api/resources/:id/reject) unused — client uses the /api/admin/resources/* set: Legacy PUT approve/reject endpoints are the documented path for prod admin scripts (bulk endpoints only cover pending resources); kept intentionally.
- **F003** (LOW) — Duplicate resource-fetch endpoints: GET /api/resource/:id and GET /api/resources/:id share one handler; only /api/resources/:id is called by the SPA: Deliberate public API aliases; code comments at server/routes/domains/catalog-contributions.ts:410-417 document /api/search and singular /api/resource/:id as intentional compat surfaces.

## Closed — not reproduced

- **F010** (MEDIUM) — Share button silently no-ops on desktop browsers without Web Share API — no clipboard fallback, no toast/feedback: handleShare already had a clipboard fallback with success/error toasts on both branches; live retest (banner dismissed, clipboard granted) shows 'Link copied' toast + URL on clipboard. Original silent no-op most plausibly the consent banner intercepting the click (F009 class, now fixed).
- **F024** (MEDIUM) — Header auth state desyncs after sign-in: 'Sign in' button shown while user is authenticated (authed controls simultaneously present): not-reproduced: stable-session lead retest shows header authed on /recommendations, /resource, /journey (headerSignIn=0, Clerk user + API user set). Artifact of validator daemon resets. Evidence: p3lead/results.json markers:*, captures/05-markers*.png
- **F025** (MEDIUM) — Authenticated session does not survive a full page reload (dev/localhost) — guarded screens fall back to sign-in form after reload: not-reproduced: session survived page.reload() fully authed (markers:after-reload). Clerk dev localStorage lost between validator daemon restarts, not a product bug. Evidence: p3lead/results.json, captures/06-after-reload.png
- **F026** (MEDIUM) — Guest bookmarks not observed merging into account after sign-in (no merge messaging, /bookmarks empty): not-reproduced: guest device bookmark appeared in account library after sign-in with explicit merge toast "Already in your library". Evidence: captures/04-authed-bookmarks.png

## Verification highlights

- seo-snapshot gate (final cold-boot confirmation 2026-08-19T16-44-57): **0 structural failures, 100.00% schema pass (2324/2324), 0 duplicate title clusters, 20/20 hydration parity** — down from 45 failures pre-fix.
- Client fix sweep (Playwright, headless Chromium): 10/10 PASS — F009 both viewports overlap 0px, F013 recovery CTAs, F014 breadcrumb, F015 min button 40px, F019 Escape clear, F020 locale formatting, F021 no title flash on /notifications and /onboarding, F011/F012 no bare 'Unknown'.
- Admin sweep (throwaway Clerk admin): F016 forced-abort error banner + Retry recovery PASS; F017 16 tabs all >= 40px at 375px PASS.
- F010 share: 'Link copied' toast + clipboard verified; original repro attributed to consent-banner click interception (F009 class).
- Server fixes committed earlier this cycle: F023 decode guard (da4abce4), F022 duplicate-URL 409 (93fb2258), F008 tag canonicalization (c0e247cb), F007 log gating (bd773ccb).

## Evidence index

- `findings.json` — master ledger (all statuses, evidence pointers, resolutions).
- `fixes/` — post-fix screenshots + sweep-results.json.
- `v1/`-`v5/` — phase 2/3 capture sets referenced per finding.

## Residual risk / follow-ups

- F005/F006 are encoded in journaled, idempotent migration `0045_audit_catalog_data_fixes.sql`; the normal publish path applies the corrections to production.
- Tag-page prerender keeps bounded retries for downstream transient saturation, while the uncached-resolution semaphore caps active work and abort-aware waiters. Local overflow fails immediately rather than accumulating retry timers.

## Clean confirmation pass

The August 19 confirmation pass found no new application finding and met the
binding `critical-high-medium` exit threshold without relaxation. Evidence:

- cold-boot SEO snapshot: 2,332 URLs, 0 errors, 2,324/2,324 schema, 20/20 parity;
- print 49/49, responsive 32/32, tablet 21/21, URL state 31/31, collections 12/12;
- typo search 30/30, cache contract 30/30, pool burst 60/60;
- real database-lock resilience: 80/80 bounded SSR 503s, in-flight rebuilds
  stayed at or below 64, overflow failed in 29ms, readiness recovered to 200
  in 26ms, and no late write remained;
- final QA teardown: 0 `__qa_test_*` users and 0 QA resources.

The final resilience gate distinguishes local admission overflow from downstream
transient saturation. Local queue overflow must return within one second and
passed in 29ms; only downstream pool/public-cache saturation retains the bounded
retry ladder.
