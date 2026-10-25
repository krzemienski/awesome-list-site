# Full functional audit — 2026-10-25

Piece D of the October improvement waves. Scope: every page, control, form, dialog, menu, tab, filter, keyboard shortcut and backend endpoint, for signed-out visitors, signed-in members and admins, driven in a real browser at 1440×900, 820×1180 and 390×844, with single `curl` requests for API reads. No test scripts, suites or gates were written or run (owner rule).

Branch: `improvement-waves-2026-10` (PR #28). Environment: local dev servers on throwaway Postgres clones of the catalog (1,949 approved resources), the Clerk dev instance, and the configured Anthropic router (`router.hack.ski`). Production was only read.

Method: two read-only readers built the inventory from `client/src/App.tsx`, the pages and components, `server/routes.ts` and `server/routes/domains/` (about 200 routes, 18 admin tabs). Three auditors, none of whom wrote code, drove their area: public, member, admin. Failures went to author agents in groups (G1–G4), each fix was reviewed and re-checked by the lead in the browser before merging, then three fresh auditors re-drove every failure, the regression watchlist and the neighbours of each fix on the merged code. Four reviewers then read the whole PR diff, and their findings became G4.

## What was checked

| Area | First pass | Final pass |
|---|---|---|
| Public browsing, search and filters, resource pages, shell, consent and analytics, public endpoints | 104 PASS, 13 FAIL, 9 UNVERIFIED | 47 PASS, 2 FAIL (fixed in G4), 8 UNVERIFIED |
| Accounts, bookmarks and collections, journeys, submissions, notifications, settings and themes, signed-in endpoints | 141 PASS, 6 FAIL, 1 doc finding, ~10 UNVERIFIED groups | 21 PASS + 21 page×width visual checks, 2 FAIL (1 fixed in G4, 1 not a bug), 6 UNVERIFIED groups |
| Every admin tab incl. the researcher, admin endpoints | 141 PASS, 5 FAIL, 17 UNVERIFIED | 45 PASS, 1 FAIL (fixed in G4), 5 UNVERIFIED groups |

The regression watchlist built from the project's history (87 past breakages; `.claude/skills/verify/references/regression-watchlist.md` locally) was re-run on its "always re-check" journeys: counts agree across surfaces, sticky header and consent banner at three widths, card to detail from every listing type, Back/Forward with filters and `?page=`, signed-in hard loads, bookmark add/remove/reload, clean console, no overflow at 390, tablet navigation, search, admin write freshness, resource first-load stability, the mobile drawer, admin dialogs, consent. All pass on the final code.

### Researcher end to end
Run on the merged code from the guided view, advanced fields empty, target 2, budget $1.50: "About to run on" showed `router.hack.ski`, "router via ANTHROPIC_BASE_URL", `cc/claude-opus-5`, `cc/claude-haiku-4-5-20251001`. Followed live at 1440 and 390: five phases, two scouts, two discoveries, the polite live region announcing each change, no animation under reduced motion. A second start from another tab returned 409 `RESEARCH_JOB_ACTIVE`. Cancel opened its confirm and "Keep running" left the run going. Result: completed, 9 turns, $1.1339 reported. One discovery approved (resource 1957, visible signed out on `/resource/1957` and in its category after a no-cache reload; footer 1,949 → 1,950), one rejected with a reason.

## What failed and what was fixed (root cause in one line each)

Pre-existing defects found by the audit (not introduced by pieces A–C):
- **Catalog count drift** (listings 1,934 vs 1,949): the tree builders dropped approved rows whose URL matched another after lowercasing and trimming a trailing slash. Fixed: every approved row is in the tree.
- **`?tag=` filters could not be removed** on `/search` and Home: readers merge `tag` and `tags`, writers cleared only `tags`. Fixed in the shared URL writer.
- **`/` could not be typed in the search palette**: the shortcut handler called `preventDefault` while the palette input had focus. Fixed.
- **Escape in the palette also dismissed the consent banner**: the banner's window listener ignored `defaultPrevented`. Fixed.
- **Invalid taxonomy filter showed a retry loop**: a 400 fell into the full-page error branch. Now shows "Clear invalid filters".
- **Sidebar collapse at 820 had no effect but changed the desktop layout later**: the toggle persisted state for a mode that does not exist at that width. Hidden at 768–1024.
- **Dead "Compact navigation" item**: removed.
- **Curated home with a non-matching filter showed empty sections**: added the shared empty state.
- **Empty "TAGS" heading on resources with no tags**: removed, matching the server render.
- **`/advanced` counts (19 subcategories, 2,440 tags) disagreed with the site**: now use the visible-tree and `/api/tags` definitions.
- **`/logout` left the owner-password cookie**: it now runs the same sign-out sequence as the account menu.
- **Console error on sign-in**: `history.replaceState` ran during render. Moved to a layout effect.
- **Two paid research runs could start at once**: the server had no admission check. Now an advisory-locked transaction returns 409.
- **Researcher Cancel had no confirm**: added.
- **Guest related-link clicks posted to `/api/interactions` (401)**: guarded on a signed-in user.
- **Dry-run GitHub import claimed it imported**: message now says what it would do.
- **Empty taxonomy nodes were listed and indexable**: now `noindex, follow`, out of the sitemap and hidden from listings, decided from data.
- **Touch targets under 44px** (resource chips and tags, admin row checkboxes, bookmark select and tag pills, "Why this?" toggle): grown hit areas, same visuals.
- **Admin Resources "Clear filters" always shown; no select-all**: fixed.
- **Collections could not be reordered below 1024px**: the same reorder action is now on the mobile control.
- **Account-deletion confirm closed before showing progress or errors**: now stays open.
- **Journey cards printed a stray "0"; Resume failed silently**: guarded counts; error toast added.
- **Counts stayed stale in the approving tab after approving a discovery**: the shared write boundary now treats discovery approval as a catalog write.
- **Returning, consented visitors lost the landing `page_viewed`**: events sent before the vendor SDKs started (after first paint) were dropped. Now held and sent once they start (G4).

Found by the PR review (introduced or exposed by this branch, fixed before merge):
- **Token-only override could reach api.anthropic.com**: the run environment only pinned the router when the server had its own credential. Now always pinned, refused when no base URL is configured, and a run refuses to start if its environment's host differs from the approved one.
- **Scout model override could be swapped silently by the SDK**: overrides are now mapped to what actually runs or refused (`unsupported_scout_model`, or `missing_env` for an unset tier variable).
- **Base URLs with a query string** were stored in job rows: now refused.
- **Sitemap and crawler disagreed for repeated subcategory slugs**: the sitemap uses the same resolver.
- **A link to a missing research run polled forever and trapped the admin**: polling starts only once the job loads; the error offers "Start another run"; `?jobId` is cleared when leaving a run.
- **Admin screens could reach Amplitude Session Replay from a second tab**: each tab now stops its own SDKs when it learns the user is an admin; replay uploads refuse while suppressed. SDKs restart if a non-admin replaces a stale admin marker.
- **Sign-in redirect cleanup ran once per mount**: now runs on every location change.
- **Radix Tabs 1.2 fired every tab change twice** (from the dependency refresh): deduped in the shared tabs wrapper.
- **js-yaml 5 crashed the server at boot; express-rate-limit 8 logged a validation error at boot** (from the major upgrades): fixed imports and key generator.

Not a bug: the `/profile` "Continue learning" title link (a 32px text link with a 44px button to the same page beside it); the taxonomy "Clear invalid filters" concern (every parameter that can return 400 is reset).

## What could not be checked, and why

- **Journeys with data** (start, complete, undo, Resume): no journey exists locally, the admin panel cannot create one, and the only creator is a paid seed CLI (a script, banned). Empty and not-found states were driven; real journeys were viewed read-only on the published site.
- **Owner-password sign-in and sign-out**: the password is a secret the agents did not read. The cookie-clearing response was observed.
- **Account deletion submit, "Sign out all devices", a populated notifications inbox, the offline theme queue**: destructive to the shared test account, or need the digest worker or a throwaway account.
- **PostHog, GA4 and Replit (Umami) events**: PostHog drops automation browsers, there is no GA4 measurement id locally, and the Replit tracker exists only on the published site.
- **`performance` web-vitals event contents**: sent only to GA4 and Replit.
- **Paid or external actions**: enrichment start, link scans, backups (Replit storage), GitHub export and configure, seeding.
- **Real touch devices**: widths were emulated.

## Owner steps after publishing

1. Before using the Replit workspace after pulling, run `npm run db:push` (or apply `migrations/0058_research_run_config_and_cost_basis.sql`; it is idempotent). The dev database never runs the boot migrator. Production applies 0058 on Redeploy.
2. Confirm the deployment has the `ANTHROPIC_AUTH_TOKEN` secret. Research runs now require it and never fall back. As admin, `GET /api/researcher/config` shows `preflight.ok`.
3. Check the router's authentication: `router.hack.ski` accepted a deliberately invalid bearer token during testing and billed the run.
4. If the publish install returns 403 on `undici-7.29.1` (dev-only, via `wrangler`), add an `undici` override or drop the unused root `wrangler` dependency.
5. Publish, then: check the new onward links and the resource-page search entry and their events in Replit Analytics; confirm admin sessions are excluded from Umami page views; confirm 3 page views per 3-page visit; confirm `performance` events carry fcp and ttfb and no fid.
6. Publish, then sign in on the live site and hard-reload a few member pages (one dev-mode sign-out at 820 could not be reproduced).
7. Curate the 15 near-duplicate URL pairs the count fix made visible (two cards each).
