# Run8 — "2026-07-16" black-box audit (6 findings) — verdict table

Audit context: 6 findings (1 CRITICAL / 1 HIGH / 3 MEDIUM / 1 LOW) against https://awesome.video.
Triage date: July 15, 2026, immediately after the Run7 republish (all Run5/6/7 fixes live).
Iron Rule: every verdict below is backed by a live prod probe (curl / Playwright) or a dev proof
for fixes that need a republish to reach prod.

| # | ID | Sev | Title | Verdict | Proof |
|---|----|-----|-------|---------|-------|
| 1 | BUG-001 | CRITICAL | All resource detail pages 404 | **INVALID** — auditor invented slug URLs | The app's resource routes are numeric `/resource/:id`, never slugs. Live sitemap.xml (355,966B) contains only numeric URLs (`/resource/185020`, `/resource/184751`, …) — the audit's claim "the sitemap generates valid /resource/{slug} URLs" is false. `/resource/185020` → 200 with full resource `<title>` live; `/api/resources/ffmpeg` → 404 is the *correct* response for a nonexistent identifier (the audit's own acceptance criterion #4). All 10 "affected" URLs are title-derived slugs that never existed. |
| 2 | BUG-002 | HIGH | Feedback widget persistently open / wrong auth state | **PLATFORM** — Replit-injected, zero app code | Prod home HTML contains `replit-cdn.com/feedback-widget/widget.global.js` — injected by Replit's deployment platform, not present anywhere in this repo (same verdict as Run4 NEW-014, Run6/7 platform findings). The app cannot control its open state, dismissal persistence, or make it aware of the app's session. Our CSP allowlists the origin so it at least loads/styles cleanly. |
| 3 | BUG-003 | MEDIUM | 4 CSP inline-script violations on /admin | **FIXED (run8)** — root cause: 304 pairing a stale-nonce body with a fresh-nonce header | Reproduced live (Playwright `securitypolicyviolation` listener: 4× `script-src-elem` inline blocks at HTML lines 59/97/159/180 — all four ARE nonce'd in the served HTML). Root cause proven by curl: the HTML document's ETag is template-based and static (`W/"233a-19f66eae938"` across requests) while the CSP nonce rotates per response; a browser revalidation gets **304** → cached old-nonce body + fresh-nonce CSP header → every inline script blocked. Fix: document navigations can never 304 (conditional request headers dropped in `server/index.ts`) and the buffered HTML flush strips ETag/Last-Modified + sets `Cache-Control: no-store` (`server/og-middleware.ts`). Dev proof: `GET /` → 200, `Cache-Control: no-store`, no ETag; `If-None-Match` probe → 200 (was 304-eligible); `/favicon.ico` keeps its ETag. Needs republish for prod proof. |
| 4 | BUG-004 | MEDIUM | Journey detail pages 404 with API 500 | **FIXED (run8)** — NaN id reached the DB and threw | Reproduced live: `GET /api/journeys/beginner-video-engineer` → 500 (`parseInt("beginner-video-engineer")` = NaN hit the DB). Journeys are id-based (`/journey/6` → 200 live, h1 "Video Streaming Fundamentals"); the slug URL never existed, so the correct answer is 404, not a crash. Fix: NaN guards → 404 on `GET /api/journeys/:id` and the three sibling routes (`:id/start`, `:id/progress` GET/PUT). Dev proof: slug → 404 `{"message":"Journey not found"}`, `/api/journeys/6` → 200, `/api/journeys/999999` → 404. Note: the audit's criterion "renders journey detail for the slug" is not applicable — that journey identifier does not exist; slug-based journey URLs would be a new feature, not a defect fix. Needs republish. |
| 5 | BUG-005 | MEDIUM | Admin Categories/Users tabs non-functional | **INVALID** — both tabs work live | Playwright on prod (1440px, logged in as admin): tab bar has 15 tabs (not 12); `tab-categories` click → `data-state="active"`, panel renders "Categories Manager…"; `tab-users` click → `data-state="active"`, panel renders "User Management — 18 registered users" (with the Run7 masked emails: `f•••@gmail…`). The bar is intentionally scrollable; scroll-into-view + click works. |
| 6 | BUG-006 | LOW | 404 page triggers console errors | **NOT-A-DEFECT** — the "error" is the deliberate 404 status on the document itself | The single console error is `Failed to load resource: 404` for the *document* request — our og-middleware intentionally returns HTTP 404 for unknown routes (correct soft-404 behavior; returning 200 would reintroduce the SEO soft-404 defect fixed in an earlier round). The two "failed requests" are fire-and-forget beacons aborted during teardown: the dead-link telemetry POST (endpoint verified healthy: curl POST → 204) and GA collect beacons. Zero broken page references (favicon/manifest/CSS all load). |

## Summary

- 2 fixed (BUG-003 CSP nonce/304 mismatch — the real mechanism behind the audit's admin CSP noise; BUG-004 journey NaN → 500)
- 2 invalid (BUG-001 invented slug URLs; BUG-005 tabs work live)
- 1 platform (BUG-002 Replit feedback widget — outside app control)
- 1 not-a-defect (BUG-006 intentional 404 document status)

## Fixes shipped this run (2)

1. **BUG-003** — `server/index.ts` + `server/og-middleware.ts`: nonce'd HTML documents must never be
   served via 304 revalidation. Conditional request headers (`If-None-Match`/`If-Modified-Since`) are
   dropped for GET document navigations (non-`/api`, extension-less paths), and the buffered HTML
   response strips `ETag`/`Last-Modified` and sets `Cache-Control: no-store`. Hashed `/assets/*` and
   API routes keep normal caching.
2. **BUG-004** — `server/routes.ts`: `isNaN` guards on all four `/api/journeys/:id*` routes return
   404 instead of letting NaN reach Drizzle and throw a 500.

## Verification

- `npx tsc --noEmit` clean.
- Dev curls: journeys slug → 404 / id 6 → 200 / id 999999 → 404; `GET /` → 200 + `Cache-Control:
  no-store` + no ETag; `If-None-Match` probe → 200; `/favicon.ico` keeps ETag (assets unaffected);
  home HTML still renders (`id="root"` present).
- Prod P0 smoke (Playwright, desktop 1440px + mobile 375px, `scripts/run8-smoke-prod.mjs`):
  home renders 27 category links (9 mobile), `/search?q=ffmpeg` → 211 results / 24 links on page 1,
  category page renders 24 resource links, `/journey/6` renders. Admin login + all-tab activation
  proven in `scripts/run8-verify-prod.mjs`.
- Observation (not in audit): the prod bundle triggers one silent `script-src` **eval** CSP block
  (`assets/index-*.js` line 567) on every page — a library feature-probe, no console error, no
  functional impact observed. Logged here for a future round if it ever matters.

**BUG-003 and BUG-004 need a republish to reach production.** After republish, re-prove:
`curl -sS -o /dev/null -w '%{http_code}' https://awesome.video/api/journeys/beginner-video-engineer`
(expect 404) and an authenticated /admin load with zero CSP violations (repeat visit / hard refresh
both clean — `scripts/run8-csp-probe.mjs`).
