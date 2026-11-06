# What to stop testing routinely (input to owner decision 9)

Layout is mine. Nothing here recommends deleting anything. "Retire" means: drop from per-deploy and weekly runs; keep as a regression note. Counts are from `evidence/lead/c22-retier-rows-v2.tsv` (259 retire rows). Usage evidence: `lanes/analytics.md` (DB pulls 2026-11-06; QA accounts filtered by a heuristic, so "real" is an upper bound).

## Retire groups (259 rows in 10 groups)
| # | Group (plain words) | Rows | Why not worth routine runs | Test again when… |
|---|---|---|---|---|
| 1 | Edit-suggestion queue in admin (ED-01..22): the screen where the owner reviews visitors' proposed edits | 22 | 117 suggestions in 90 d, 116 from test accounts; 1 real in Nov; 0 pending now | `PendingEdits.tsx` or the `/api/admin/resource-edits*` routes in `admin-content.ts` change |
| 2 | Contact inbox (AU-18..27) | 10 | only QA messages found; no real contact ever seen | `ContactSubmissions.tsx` or `server/routes/domains/contact.ts` change |
| 3 | Visitor link reports (LH-15..17, 20..22, 31) | 7 | 0 reports ever (0 open, resolved or dismissed) | `link-reports.ts` or `LinkReportsPanel.tsx` change |
| 4 | Actions that must not run on production (sign-out, login spam, seed/reseed, real user role change/delete, GitHub import/export confirm, delete real resource, profile sign-outs) | 12 | irreversible or revoke every owner session; QA-row versions cover the logic | the guarding code changes (`admin-content.ts` delete/seed, auth routes); then test on a QA row only |
| 5 | Seed-result states reachable only off-production (DB-10..12) | 3 | cannot be produced on prod | seeding code in `AdminRepository`/seed route changes |
| 6 | Member-page loading/offline/error/empty/touch sweeps (C6-MB, 28 rows) | 28 | real member use is tiny (real recommendation feedback only since Nov, ~21 rows); no data-loss guard | the matching component in `client/src/pages/` (profile, bookmarks, onboarding) changes |
| 7 | AI/GitHub/Research/Enrichment screens: run-state, error, empty variants | 47 | researcher still runs, but state variants need a live paid job; GitHub sync last ran 2026-07-20 | `ResearcherTab.tsx`, `BatchEnrichmentPanel.tsx`, `GitHubSyncPanel.tsx` or the `ai-jobs.ts` routes change |
| 8 | Core admin tabs: duplicate cards, loading/retry/empty variants (Overview, Approvals, Resources, Database, tab strip) | 51 | one populated pass per tab is already per-deploy; the rest repeats it or is covered by Tier 1 GETs | `AdminOverview.tsx`, the Resources table, or `admin-content.ts` list routes change |
| 9 | Ops tabs: link-health, export, digest, users, audit variants | 40 | owner tools used rarely; states repeat a populated pass | `export-link-health.ts` or the tab component changes |
| 10 | Taxonomy and journey editors: load/validation/empty variants | 39 | 9 categories, 5 journeys, edited by the owner only; no visitor path | `admin-content.ts` taxonomy routes or `journeys-recommendations.ts` admin routes change |

## Feature retirement candidates (not a recommendation to delete)
| Feature | Usage evidence | Code size (wc -l, main files) | Risk of removing |
|---|---|---|---|
| Edit-suggestion queue | 117/90 d, 116 test | client `PendingEdits.tsx` 776 + `RecentResourceEdits.tsx` 184; server routes inside `catalog-contributions.ts` (~1037) and `admin-content.ts` (~1188-1300) | Medium: removes the only way for visitors to propose fixes; `resource_edits` rows must be handled |
| Visitor link reports | 0 ever | `LinkReportsPanel.tsx` 175 + `link-reports.ts` 150 | Low: automated link health already runs daily |
| Contact form + inbox | only QA messages | `ContactSubmissions.tsx` 330, `contact.ts` 263, `contact-dialog.tsx` 244, footer 116, repo 64, retention job 50 | Medium: visitors lose a way to reach the owner; privacy policy mentions it |
| `/advanced` explorer | no nav entry | `Advanced.tsx` 386, `category-explorer.tsx` 573, `export-tools.tsx` 925, `community-metrics.tsx` 206 | Low-medium: still listed in robots.txt as crawlable; direct links break |
| `/design-system` showcase | no nav entry | `DesignSystemShowcase.tsx` 506 (+ `client/public/ds/design-system.js` 190) | Low: check the awesome-ds-verify skill does not depend on it |
| 4 consent-gated analytics SDKs (GA4, Mixpanel, PostHog, Amplitude) | <2 % of visitors emit events; no read access to any | `analytics.ts` 942, `mixpanel.ts` 264, `amplitude.ts` 225, `posthog.ts` 207, `mixpanelServer.ts` 172, sdk-options 310 | Medium: consent banner, privacy text and the Replit half share `analytics.ts` |
| ~15 orphan endpoints (`inventory.md` §3) | no client caller found (medium confidence: dynamic paths hide callers) | one-to-few lines each | Medium: external API users or old email links may call them |

Not measured: real page views (blocked, `analytics.md` §a), so "not used" for pages rests on DB counts and nav entries only.

## Lead note (2026-11-06)
`/design-system` is not removable without breaking tooling: `~/.claude/skills/awesome-ds-verify` drives it (gate `ds-showcase`, `scripts/verify-ds.mjs:128`, `references/gate-map.md:118`). Its removal risk is high, not unknown.
