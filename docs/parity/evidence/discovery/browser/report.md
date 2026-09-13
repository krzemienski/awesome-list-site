# Task 553 discovery browsing validation

Date: 2026-09-13T05:13:24Z (UTC; local validation run)  
Target: real app `http://127.0.0.1:5000`  
Theme observed/required: Editorial + Crimson (the design-system origin confirms Editorial pressed and Crimson selected; app shell uses the corresponding crimson accent).  
Source changes: none. Mocks: none.

## Captures

Retained 39 full-page PNGs under this directory:
- `categories-{375,768,1024,1440}.png`
- `search-ffmpeg-{375,768,1024,1440}.png`
- `tag-open-source-{375,768,1024,1440}.png`
- `journeys-{375,768,1024,1440}.png`
- `journey-7-{375,768,1024,1440}.png`
- `advanced-explorer-{375,768,1024,1440}.png`
- `advanced-metrics-{375,768,1024,1440}.png`
- `advanced-export-{375,768,1024,1440}.png`
- `advanced-recommendations-{375,768,1024,1440}.png`
- `recommendations-{375,768,1024,1440}.png`

All four Advanced tabs were visited and captured at all four widths: Explorer, Metrics (`?tab=metrics`), Export (`?tab=export`), and AI Recommendations (`?tab=recommendations`).

No real shared collection capture was possible; see Auth blocker below. No collection baseline exists in `tests/parity/production-baseline/2026-09-12` (gap documented).

## Axe

`axe-results.json` contains scans at 375 and 1440 for categories, search, tag, journeys, journey/7, advanced, and recommendations.
- Serious/critical: **0** on every scanned route except `/advanced` at 1440.
- `/advanced` at 1440: serious `color-contrast`, 5 nodes.
- Moderate: search has `landmark-main-is-top-level` and `landmark-no-duplicate-main` at both widths; advanced has `heading-order` at both widths.
- No findings were masked; shared shell/card findings remain reported.

## Functional/parity checks

- `/categories`: live UI showed 9 top-level categories and sidebar/category totals: 80, 333, 134, 191, 187, 266, 239, 213, 173. `/api/categories` returned 9 rows; totals matched the rendered category totals.
- `/search?q=ffmpeg`: URL state was preserved; UI rendered 24 cards (UI limit 24). `/api/resources?search=ffmpeg&limit=20` returned total 198 and its first 20 IDs exactly matched `/tmp/discovery-pre-search.json` (same API query/default limit 20). Browser Back returned to the actual prior history entry `/recommendations`, not `/categories`; this is recorded as observed history behavior.
- Tags: `/tag/open-source` and `/tag/open-sources` both returned 200 and rendered. Direct guessed `/api/tags/open-source` and `/api/tags/open-sources` returned 404. Canonical resource query probes `/api/resources?tag=open-source&limit=24`, `?tag=open-sources`, and `?tags=open-source` all returned 200, total 158, 24 rows. The app normalizes singular/plural tag slugs to the same count.
- `/advanced`: all four tab states rendered populated real data. Metrics showed 1,816 resources; Export showed 1,816 resources across 9 categories; recommendations showed popularity-based cards and a sign-in personalization prompt.
- `/recommendations`: guest page rendered real catalog cards and “Sign in to personalize these picks”.

## Auth / signed-in gaps

Attempted exactly one disposable identity through the documented Clerk e2e helper, without printing credentials. The helper generated a sign-in URL, but it redirected to the injected Replit dev-domain design-system origin (`https://...picard.replit.dev/`) with Clerk handshake parameters instead of binding to `http://127.0.0.1:5000`. The resulting page was the design-system showcase, not the port-5000 app; `/api/auth/user` auth confirmation was unavailable. Per instruction, no retry loop was attempted.

Therefore not executed: signed-in journey completion (all row IDs/completedAt), signed-in recommendations, collection creation/publish, guest real shared collection screenshot, and collection four-width captures. Exact blocker is the auth helper/origin mismatch between the injected dev domain and the requested port-5000 app. No other users or rows were cleaned up/modified.

## Comparison / chrome note

The current guest app shell is dark with crimson accents, responsive sidebar/header, and catalog cards. The requested Editorial/Crimson design-system controls are present and selected on the separate design-system origin during the helper redirect. Existing production baseline has guest captures/API fixtures but no shared collection baseline; visual comparison is therefore available for guest surfaces only and not a pixel pass. Test IDs observed include `category-card-*`, `card-resource-*`, `recommendations-list`, `button-generate-recommendations`, `consent-banner`, `mobile-drawer-trigger`, and `header-brand`.

## Axe detail limitation and active tab

The retained axe-results.json contains only summarized violation records (id, impact, node count); it does not contain selectors, HTML snippets, foreground/background colors, contrast ratios, or check messages. A fresh reproduction at http://127.0.0.1:5000/advanced with Explorer active returned zero color-contrast nodes both before and after consent dismissal, so exact five-node details cannot be truthfully supplied from the existing output. The previously retained serious record remains: color-contrast, 5 nodes, /advanced, 1440px, active tab Explorer.

## Disposable identity teardown proof

The unique attempted prefix was __qa_task553_. Before teardown, Clerk API lookup found exactly 1 matching Clerk user. That user was deleted through the Clerk API (DELETE status 200), and the follow-up lookup returned 0 matching Clerk users. A local database query for users with email LIKE '__qa_task553_%' returned localRows: 0. This proves zero matching local rows and zero matching Clerk users remain; no other identities were queried or deleted.

## Test ID baseline comparison

Not executed. No baseline test-ID inventory/diff was run; the IDs listed in this report are only IDs observed during this local pass. The production baseline was not treated as proof of a test-ID comparison.
