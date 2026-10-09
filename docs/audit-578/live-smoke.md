# Live smoke check of https://awesome.video after the 2026-10-09 13:29 UTC publish

Date: 2026-10-09 (all probes run 15:50–22:45 UTC). Run by the task agent from the workspace.
Raw evidence lives in `docs/audit-578/live-smoke/` (probe scripts, JSON results, screenshots).
Per-item evidence: `docs/audit-578/verify/`.

## Headline: production is not running the 13:29 publish

The 13:29 publish was expected to ship the 85-file commit `723b71dd` ("Published your App").
It did not. Production serves the code from its parent, `572e6739` (11:47 UTC).

| Marker | Production (`https://awesome.video`) | `723b71dd` / DEV |
|---|---|---|
| `GET /api/version` | `{"revision":"572e6739578c…"}` (the replit.app host returns the same value) | — |
| `GET /api/public/tags` top-level keys | `["tags"]` (old `storage.listTags()` handler) | `["total","tags"]` |
| `GET /api/awesome-list` metadata | `metadata.twitterImage` still present, because of the old denylist serializer | stripped by the new allowlist in `server/lib/publicResource.ts` |
| Client bundle | `index-Z4u6uXGJ.js` and 122 chunks contain none of the new `shared/seo-templates.ts` not-found strings | present |

`/api/version` alone isn't conclusive, since the build bakes `git rev-parse HEAD` and the publish commit is created around the build. The tags shape and the serializer are server behavior, though, and both match `572e6739`.

`getDeploymentInfo` reports: autoscale, public, `hasSuccessfulBuild: true`. Production logs since 13:00 UTC show only two non-fatal "Orphan watchdog sweep" connection-timeout warnings.

**Consequence:** visitors are on the earlier, previously working code. The unverified `723b71dd` changes have not reached real users yet. **The next republish will ship them for the first time**, so the per-area tasks need to prove their items before the owner republishes.

## Result summary

| Area | Flows | Result | Evidence |
|---|---|---|---|
| Prod revision | version, tags shape, serializer, bundle strings | Old code live (see above) | `verify/PROD-REVISION.md` |
| Public HTTP | 56 endpoints/pages | 54 pass; 2 flagged, neither a regression | `verify/HTTP-PROBE.md`, `live-smoke/prod-http.json` |
| Anonymous browser | 10 pages × Editorial/Brutalist × 1440/390 (40 loads) | All pass; 0 page errors | `verify/ANON-BROWSER.md`, `live-smoke/*-sweep.json`, `live-smoke/shots/` |
| Signed-in | bookmark+note add/remove, favorite on/off, theme change+restore, journey start/complete step/undo | All pass, net-zero diff `[]` | `verify/SIGNED-IN.md`, `live-smoke/signed-in-*.json` |
| Admin (read-only) | overview, approvals, edits, resources, taxonomy (categories), journeys, users, export, link health, GitHub, research, enrichment | All 12 open with no error state and no 4xx/5xx API calls | `verify/ADMIN-READONLY.md`, `live-smoke/admin-sweep-1440.json` |
| Regressions fixed | — | None found, so no code changed | — |

**Needs republish:** nothing from this task. No regression was found on production, so this task made no code change.

## 1. Public HTTP probe

Command: `node docs/audit-578/live-smoke/http-probe.mjs https://awesome.video`, which writes `live-smoke/prod-http.json`. The same script was run against DEV (`http://127.0.0.1:5000`) for comparison (`live-smoke/dev-http.json`).

The probe covered:

- **Pages:** home, category, subcategory, sub-subcategory, search with filters, resource detail, journeys list, journey detail, tag, sign-in, and the 404 page.
- **APIs:** resources (list/filter/detail/related), search, public tags, categories/nav, awesome-list, journeys and a journey detail, recommendations init (anonymous, no `refresh=true`), health, version, sitemap and robots.

For each one it recorded status, timing, byte size, top-level payload shape and a scan for internal metadata keys.

| Check | Observed |
|---|---|
| All pages | 200 with the expected `<title>`; the 404 route returns HTTP 404 with `noindex` |
| Resource/search/tree payloads | only `metadata.tags`, plus `twitterImage` on a few awesome-list rows. No `source`, `confidence`, `discoveryId`, `researchJobId`, `enrichmentError` or import bookkeeping |
| Flag 1: `/api/journeys/not-a-number` | 400 `validation_failed` (`fieldErrors.id`) instead of the 404 my probe expected. DEV is identical. The endpoint-contract validator runs before the handler's own 404 branch. Pre-existing, not from the publish; malformed ids are rejected cleanly with no 500 |
| Flag 2: `/api/awesome-list` | `metadata.twitterImage` on 2 rows. This is the old denylist behavior, unchanged on prod; the `723b71dd` allowlist removes it. Public OG image URL, not sensitive |
| `/api/search?q=ffmpeg` with `category`/`tags` | total 433 regardless of filters. By design: `/api/search` is a q-only endpoint. The Search page filters through `/api/resources`, and the browser check below shows the filtered result count |

## 2. Anonymous browser flows

Command: `BASE=https://awesome.video SYS=<editorial|brutalist> VW=<1440|390> node docs/audit-578/live-smoke/browser-sweep.mjs` (Playwright Chromium, real browser, consent cookie set to `denied`, design system selected through localStorage `ds-system`).

Pages: home, `/category/community-events`, subcategory, `/search` with a category and tag filter plus the query `ffmpeg`, `/resource/190152`, `/journeys`, `/journey/7`, `/tag/open-source`, `/sign-in`, and `/this-page-does-not-exist`.

| Combo | Status | h1 present | `data-system` applied | Horizontal overflow | Error boundary | Page errors | Console errors |
|---|---|---|---|---|---|---|---|
| Editorial 1440 | 9×200, 404 page 404 | 10/10 | editorial | 0 | none | 0 | only the expected 404 document load |
| Editorial 390 | same | 10/10 | editorial | 0 | none | 0 | same |
| Brutalist 1440 | same | 10/10 | brutalist | 0 | none | 0 | same |
| Brutalist 390 | same | 10/10 | brutalist | 0 | none | 0 | same |

Load times were 2.7–5.1 s to settle (the sign-in page is slowest because it loads Clerk).

I opened and inspected these screenshots: editorial-1440 home and 404; editorial-390 search and category; brutalist-390 journey, sign-in and tag; brutalist-1440 resource. Search showed "36 results for ffmpeg" with removable filter chips. Layouts, fonts and accents matched each system, and nothing was clipped or overlapping.

Notes, not defects:

- The home page shows "Featured 0", which reflects production data.
- The consent banner still renders when an `analytics-consent=denied` cookie is pre-seeded. The app keeps consent in localStorage, so the banner is expected for a fresh browser profile.

## 3. Signed-in flows (owner admin account, approved by the owner)

**Why not a throwaway account:** production sign-up shows a Cloudflare "Verify you are human" challenge before the email form, and production Clerk also requires a real emailed code. Screenshot: `live-smoke/shots/signup-try.jpg`. Creating a `__qa_test_578_` account would mean bypassing bot protection, which I did not do. The owner approved running these flows on the owner admin account instead, with every change undone.

Command: `STEP=<bookmark|theme|journey> node docs/audit-578/live-smoke/signed-in.mjs`. Sign-in is `POST /api/auth/admin-login` with an `Origin` header; the script snapshots state before and after, and every write goes through the real UI.

| Flow | Browser steps | Observed |
|---|---|---|
| Bookmark with note | `/resource/190152` → Bookmark → type `__qa_test_578_ live smoke note` → "Save with notes" | Toast "Added to bookmarks", button shows "Bookmarked", note rendered on the page; `/api/bookmarks` has `{id:190152, notes:"__qa_test_578_ live smoke note"}` |
| Bookmark remove | click Bookmarked again | `DELETE /api/bookmarks/190152` 200, note gone from the page, not in `/api/bookmarks` |
| Favorite | Favorite on, then off | POST then DELETE `/api/favorites/190152` 200; `aria-pressed` true then false; API agrees each time |
| Theme change | `/settings/theme` → Brutalist | `data-system` changes from terminal to brutalist; server prefs `{brutalist, amber}`; survives a reload |
| Theme reset | click Terminal, then Matrix | server prefs back to exactly `{terminal, matrix}` (the owner's prior value; I did not clear to null, which would have wiped the owner's choice) |
| Journey start | `POST /api/journeys/9/start` (this account had already started it) | 200 `{created:false, completedSteps:[]}`: idempotent, no new row |
| Journey complete one step | `/journey/9` → "Mark as Complete" on step 1 | PUT 200 `completedSteps:[217,218,219]` (all three rows of logical step 1), button shows "Completed — Undo", toast "Progress Updated", progress 17% (1 of 6) |
| Journey reset | "Completed — Undo" | PUT 200 `completedSteps:[]` |

Net-zero proof: each run printed `NET-ZERO DIFF KEYS: []`. That diff covers theme, homeLayout, preferences, bookmark ids+notes, favorite ids, and journey 9's completedSteps/currentStepId/completedAt. There were no console or page errors.

Production residue SQL (read-only) returned `users_578: 0, bookmark_notes_578: 0, bookmarks_190152: 0, favorites_190152: 0`. Side effects that can't be undone: one `POST /api/interactions` view record, and journey 9's `lastAccessedAt` was refreshed.

## 4. Admin read-only views

Command: `node docs/audit-578/live-smoke/admin-sweep.mjs`. It signs in with the owner admin cookie, opens `/admin/<section>` at 1440px, and **aborts every non-GET `/api` request the page makes**, so nothing is written.

| Section | HTTP | Active tab / heading | Error text | API ≥400 |
|---|---|---|---|---|
| overview | 200 | Overview / "Recent activity" | none | 0 |
| approvals | 200 | Approvals / "Pending approvals" (9) | none | 0 |
| edits | 200 | Edits / "Edit history" | none | 0 |
| resources | 200 | Resources | none | 0 |
| categories (taxonomy) | 200 | Categories (9 rows) | none | 0 |
| journeys | 200 | Learning Journeys (5 listed) | none | 0 |
| users | 200 | Users (119) | none | 0 |
| export | 200 | Export / "Export Awesome List" | none | 0 |
| linkhealth | 200 | Link Health / "Recent failures" (3,809 healthy, 11 broken, 2 suspect) | none | 0 |
| github | 200 | GitHub / "Sync jobs" | none | 0 |
| research | 200 | Research / "Research workspace" | none | 0 |
| enrichment | 200 | Enrichment / "Enrichment jobs" | none | 0 |

There were no page errors. The only console line per page was `net::ERR_FAILED` from the sweep's own abort of a `POST /api/send` beacon. That request isn't app code; it's the platform-injected widget. Screenshots I inspected: overview, approvals, journeys, categories, research and linkhealth. Only views with no PII were copied to `live-smoke/shots/`; approvals, edits and users show submitter emails.

## 5. Other observations

- One `POST /api/auth/admin-login` returned 500 once (~22:37 UTC). A retry seconds later returned 200, and production logs show no 5xx for that window, so it came from the platform edge rather than the app. Not reproduced.
- Production logs show admin password sign-ins from several IPs during this run, because other task agents use the same owner account. The net-zero snapshot diffs above were taken around each step and stayed empty.
- No `refresh=true` recommendations call and no paid AI calls were made (budget 0, ledger untouched).
