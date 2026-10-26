# Full functional audit on production — 2026-10-26

This audit proves pieces A–D of the October improvement waves on the live site, `https://awesome.video`. The earlier audit (`full-functional-audit-2026-10-25.md`) ran on local clones. This one used the production database, the production Clerk instance and the deployed router configuration.

Every check drove the real site in a browser at 1440×900, 820×1180 (touch) and 390×844 (touch), with single `curl` requests for API reads. No test scripts, suites or gates were written or run. Every defect found went through the same loop: root cause, a fix authored by a separate agent, review, merge to `main`, republish from the Replit workspace, and a re-check on production.

The detailed record is in `reports/prod-validation-2026-10-26/`:
- `PROGRESS.md` covers each cycle, deploy and row this run created.
- `ORIGINAL-PROMPT-CHECKLIST.md` has the status of every requirement.
- `RESEARCH.md` covers the researcher runs.
- `evidence/` holds the HARs, request bodies, snapshots and counts.

## Deploys and cycles

| Cycle | Live revision | Result |
|---|---|---|
| 1 | `e12a4e67` (PR #29) | F1 (Umami Back/Forward), F2 (admin targets), F3 (dry run writes taxonomy), G1–G3 (touch targets) |
| 2 | `b09abb1b` (empty publish commit, tree of `f9455363`) | F1–F3 and G1–G3 pass. New findings: F4 (dry run 504), F1b (event URL after Back), G4 (short tag pills 41 px wide) |
| 3 | `634e8afd` (Replit autosave commit; code identical to `6db26e73`) | F4, F1b and G4 pass. New finding: F5 (dry run plans a duplicate `iOStvOS` node) |
| 4 | `dbc173f2` | F5 passes. New finding: G5 (taxonomy breadcrumb links 18 px tall) |
| 5 | `f476d79c` = GitHub `main` | **Clean**: 0 FAIL at all three widths, 0 console errors |

## What failed and what fixed it

Each item gives the root cause in one line and the PR that fixed it.

- **F1, Umami Back/Forward.** No page view was recorded, and later events carried the previous URL. Replit's injected tracker hooks only `pushState`/`replaceState` and has no `popstate` listener. Fix: re-announce the URL on `popstate` (#30).
- **F1b, event URL after Back.** The page's own event fires about 26 ms before `popstate`, so the tracker still held the old URL. Fix: every custom event carries the URL captured when it fired (#38).
- **F2, admin targets.** "Reveal email" was 36 px, Link Health URLs 16 px and "Open Link Health" 21 px, because these controls had no hit-area floor. Fixed in #33.
- **F3, import dry run wrote taxonomy.** `ensureCategoryHierarchy` ran before the dry-run guard. Fix: a read-only planner and `wouldCreateTaxonomy`; the queued route refuses `dryRun` (#34).
- **F4, import dry run timed out.** It returned 504 after 300 s because `checkConflict` re-read the whole catalog for each of about 2,283 items. Fix: build the catalog index once, which brought the production dry run to about 10–12 s (#37).
- **F5, duplicate `iOStvOS` node planned.** `normalizeCategory` stripped `/` from headings, so `iOS/tvOS` stopped matching the existing `ios-tvos` slug. Fixed in #39.
- **G1–G3, touch targets on cards and footer.** Taxonomy-card controls were 32 px, the home card body wasn't a link, and the footer link was 14 px. CSS overrides had undercut the touch floor. Fixed in #31.
- **G4, short tag pills.** Two-letter pills were 41 px wide because they had a height floor but no width floor. Fixed in #36.
- **G5, taxonomy breadcrumb.** Links were 18 px tall because `.taxonomy-breadcrumbs a` had no floor. Fix: 24 px, as for the footer in G3 (#40).

The removal of Vercel (#32) and of the unused GitHub Pages workflow (#35) came from the owner's requests during the run. No defect prompted them.

## Final pass (cycle 5, `f476d79c`)

- **Visitor.** Home, category, subcategory, sub-subcategory (`/sub-subcategory/ios-tvos` renders "iOS/tvOS"), resource, tag and search, at all three widths:
  - No horizontal overflow and no console errors.
  - No visible target under 24 px. The 1440 home "+ N more →" links are 19.2 px tall, but they meet the WCAG 2.5.8 spacing exception: the nearest target is 15.6 px from their centre.
  - Visitor pages send Umami, GA4, Mixpanel, Amplitude and PostHog events.
- **Admin.** All 17 tabs at all three widths show 0 console errors, 0 page errors and no horizontal scroll. About 1,830 requests per width, with 0 vendor analytics sends.
- **Import dry run.** HTTP 200 in 11.0 s, `wouldCreateTaxonomy: []`, 0 errors. Category, subcategory, sub-subcategory, sync-queue and resource counts were identical before and after.
- **Signed-in hard reloads.** Seven member pages at three widths stay on the page.
- **Earlier cycles, still valid on this code.** These were proven on builds whose code differs from `f476d79c` only by #39 (server import) and #40 (one CSS line):
  - Umami page views and event URLs after Back (cycle 3).
  - The `redirect_url` sanitizer (cycle 3).
  - The researcher end to end, with run #64 approved into public resource 190342 (cycle 1).
  - PostHog URL scrubbing (cycle 5).

## Not verified on production

- **Member flows with a fresh account (D5).** These need a throwaway account on the live Clerk instance, and only the owner can create one. They were proven on the Clerk dev instance in the 2026-10-25 audit.
- **Sign-out through `/logout` (D3).** This runs last, because it revokes the only production admin session available to this run.
- **Missing environment variable stops the researcher before launch (B10).** Proving it means removing a production secret, which is on the owner-confirmation list. It was proven on dev.
- **Researcher save-refusal paths (U1, U2, U5).** The orchestrator would not save fabricated URLs, so these paths can't be triggered without fake data.
- **Owner dashboards (A15, A16, O3, O5).** GA4 Enhanced Measurement history page views still double-count until the owner switches them off (steps in `docs/ANALYTICS.md`). Replit Analytics event visibility and router access settings need the owner's login.

## Notes for maintainers

- Production tooling: posthog-js drops every event when `navigator.webdriver` is true. Automation browsers therefore show no PostHog traffic unless the harness reports a normal browser.
- Two subcategory names, `RTMPRTSPHTTP Protocol Servers` and `Widevine FairPlay PlayReady Integrations`, are spelled that way in the upstream awesome-video README. Fix them upstream, because a rename on the site is undone by the next import.
- Replit publishing rules are in `docs/DEPLOYMENT.md`, under "Publishing GitHub main".
