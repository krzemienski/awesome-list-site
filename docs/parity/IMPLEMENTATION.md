# Implementation ledger

Requirement-by-requirement record of the design-parity build against the frozen
prototype (`awesome-list-site-ds/`), organised by the execution contract's
section 4 areas (A–G in [MAIN-SESSION-EXECUTION-PROMPT.md](MAIN-SESSION-EXECUTION-PROMPT.md)).

Statuses: `verified-complete` (real-browser proof passes the contract's
threshold), `needs-implementation` (behaviour absent), `needs-repair`
(behaviour present, proof fails), `unverified` (no fresh proof on this
candidate). Pixel percentages are the harness's differing-pixel share against
the 0.5% ceiling; run directories live under `tests/parity/baseline/<run>/`
with `actual/`, `expected/` and `diff/` PNGs per cell. The authoritative
per-cell table is the runner-generated [REPORT.md](REPORT.md); this ledger
explains *why* each cell is where it is and who owns it.

The Status column is read against the full-inventory run
`2026-09-16T05-55-50-268Z-6075` ([STATUS.md](STATUS.md), [REPORT.md](REPORT.md):
56 pass / 128 fail of 188 measured pixel rows, 40 blocked, gate **NOT
PASSED**) plus the selected reruns taken after it on 2026-09-16 (run directories
`…06-59-13-579Z-19499`, `…07-03-25-409Z-20621`, `…07-08-57-394Z-332`). Selected reruns never overwrite the
shared report; where one supersedes a full-run cell it is cited explicitly.

## A. Theme foundations and five design systems

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| Five systems × ten accents selectable at `/settings/theme`, systems change typography/geometry/motion | `styles.css` system skin blocks; `app.jsx` theme page | `client/src/styles/design-system.css` skin blocks + registry (`client/src/lib/theme/*`) | none found | integrator | 50/50 combinations, 0 failures: [tokens/50-combo-results.json](evidence/tokens/50-combo-results.json); per-system captures [multi-system/](evidence/multi-system/) (`audit-567-summary.json` phases theme/runtime/smoke/axe/font-prepaint all COMPLETE) | verified-complete |
| Token registry enumerated from source, not prose counts | `styles.css` `:root` | `canonical-tokens.json` + `canonical-token-parity` gate (effective cascade resolver) | none | integrator | gate PASS in validation run `beVZ6foyuPqgD5DGI91O3` and after `4f5e8968`; mutation probes in [tokens/gate-mutations.md](evidence/tokens/gate-mutations.md) | verified-complete |
| Theme applied before first paint, CSP + SSR intact, manual accent preserved across system switches, stale values/reload/denied storage | `app.jsx` theme boot | pre-boot inline theme script (nonce'd) + storage guards | none | integrator | filmstrips [tokens/filmstrip.md](evidence/tokens/filmstrip.md), `font-prepaint` gate PASS, theme-registry-types PASS | verified-complete |
| Real font families/weights per system; ONE canonical Google Fonts request in the app shell | `index.html` css2 link | shell `<link>` byte-identical to the design's nine-family URL; `accent-drift` `canonical-font-request` check | none | integrator | [worklog/fonts.md](worklog/fonts.md) gates table: webfont-fetch 6/6 200, 190 `@font-face`; font-set before/after in [fonts/](evidence/fonts/) | verified-complete |
| Design-system preview renders headings with the same font files as the live site | `index.html` css2 link | `artifacts/awesome-video-design-system` loads its own font set | the fonts evidence measures the app and the frozen prototype only; `worklog/fonts.md` explicitly excludes the registered artifact | integrator (proposed task 534) | none on this candidate | unverified |
| `.page` atmosphere + `.grain`; body ink not metadata ink; accent discipline; chart ink ramps | `styles.css` `.page::after`, `.grain` | `.page::after` clipped by per-system token (raster budget); `accent-drift` + `palette-drift` gates | none | integrator | gates PASS after `4f5e8968`; ink review [worklog/audit-567-ds-verdicts.md](worklog/audit-567-ds-verdicts.md) | verified-complete |

## B. Application shell

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| Sticky 60px header, brand left, controls right, blur, responsive | `layout.jsx` header | `AppHeader.tsx` + `shell.css` | header strip still 2.3–5.4% vs reference (user menu/search glyph geometry) | integrator | [shell-header/final-results.json](evidence/shell-header/final-results.json): 375 5.37%, 768 2.70%, 1024 2.33%, 1440 2.67%; strips `app-*-strip.png` vs `expected-*-strip.png` | needs-repair |
| Four-column footer → two → one, working destinations | `layout.jsx` footer | `AppFooter.tsx` | none | integrator | [footer/results.json](evidence/footer/results.json): columns 4/4/2/1 at 1440/1024/768/375, no overflow, every href 200, axe clean; `footer-*.png` | verified-complete |
| Sidebar 280 desktop / 240 tablet / drawer <768; tablet sidebar at 768 | `layout.jsx` sidebar | `AppSidebar.tsx` | 768 renders the drawer, not the tablet sidebar (contract: "at 768px the design calls for the tablet sidebar") | w-public → integrator | [sidebar/RESULTS.md](evidence/sidebar/RESULTS.md): 280@1440, 240@1024, absent@768/375; 8/8 UX spec, 52/52 responsive audit | needs-repair |
| Collapsible 56px rail, persisted state, L1/L2/L3 nesting, counts, `+N`, connectors | `layout.jsx` | `AppSidebar.tsx` tree + `sidebar.css` | none found | integrator | sidebar functional captures [sidebar/functional/](evidence/sidebar/functional/); `sidebar539-final-probe.json` unique IDs 18/18 | verified-complete |
| Active ancestors + breadcrumbs; branch expand never navigates; leaf navigates | `layout.jsx` | `AppSidebar.tsx`, page-owned crumbs (shell crumb row hidden per `4fb9f4ac`) | none | integrator | `sidebar539-browser-pass2.log` (in sidebar evidence); clickthrough [clickthrough/local/clickthrough.json](evidence/clickthrough/local/clickthrough.json) | verified-complete |
| Drawer/modal focus traps, Escape/backdrop, scroll lock, focus return, unique IDs, names | Radix contracts | Sheet/Dialog primitives | none | integrator | responsive audit 52/52 incl. authenticated drawer trap; axe 0 serious/critical [axe/](evidence/axe/) | verified-complete |
| Ctrl/⌘-K palette: open, type, results, keyboard select, navigate, Escape | `layout.jsx` palette | `CommandPalette.tsx` (cmdk) | none | integrator | keyboard clickthrough [clickthrough/keyboard-desktop-final/](evidence/clickthrough/keyboard-desktop-final/); full run `app.shell.palette` PASS at 375/768/1024/1440 and `app.shell.mobile-drawer` PASS at all four widths | verified-complete |
| No duplicate nav, sideways overflow, sticky failures, footer/consent overlap | — | `overflow: clip` shell, single header search | reference itself overflows to 400px at 375 on admin overview (`minmax(360px,1fr)` grid, `admin.jsx:121`); app deliberately stays within 375 | integrator | sticky-preview audit 7/7; overview 375 pair `2026-09-16T05-32-47-908Z-2440` (expected 400×1999 vs actual 375×2028) | verified-complete (documented reference residual) |

## C. Home, taxonomy, resource and search

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| Index default home + selectable Curated, real data, distinct composition | `app.jsx` Home/Curated | `Home.tsx` (`?layout=curated`) | none | integrator | full run: `app.home.index` and `app.home.curated` PASS at 375/768/1024/1440 | verified-complete |
| Home filters with live counts, clear/reset, empty, featured, kind strip | `app.jsx` filter strip | `HomeFilterStrip.tsx` + `/api/resources/counts` | none | integrator | [kind-api/curl-counts.txt](evidence/kind-api/curl-counts.txt) 1816 == DB; `curl-kind-filter.txt` 0 mismatches (API/data proof). The empty state's pixel cell `app.system.empty-search` is token-only and UNVERIFIED in REPORT | verified-complete (counts/filter API); empty-state rendering unverified |
| Category / subcategory / sub-subcategory layouts, breadcrumbs, counts, pagination, SSR parity | `app.jsx` Category | `CategoryPage.tsx` family, 24/page lockstep | full run: `app.category` 9.81/6.27/5.91/6.29% and `app.subcategory` 9.95/7.00/6.60/7.24% at 375/768/1024/1440 — listing composition still differs from the frozen Category page at every width; `app.subsubcategory` is token-only (UNVERIFIED); reference pager binds first listing page only (accepted residual) | w-public → integrator | REPORT rows `app.category`, `app.subcategory`; taxonomy-listing-parity gate PASS | needs-repair (all widths) |
| Resource detail: real content, bookmark/collection/notes/edit/external link; no placeholder rows | `app.jsx` ResourcePage | `ResourceDetail.tsx` + `resource.css` (secondary sections behind "More") | full run after the rework: 1440 PASS 0.486%; 1024 0.686%, 768 0.689%, 375 2.83% still over the ceiling (secondary-section geometry below the fold) | integrator | [resource-detail/](resource-detail/) worklog; REPORT row `app.resource.detail` | needs-repair (≤1024) |
| Search: real results, no-results, clear/reset, query state, Back/Forward | `app.jsx` Search | `SearchPage.tsx` | `app.search` cell BLOCKED in harness (reference has no bound search state) | integrator | `search-typos` gate; URL-sync popstate fix (memory) | unverified (pixel blocked) |
| RIST / MPEG & Forums / Official Specs error screens investigated | — | routes render; historical failures were rate-limit (edge 429) and reserved-character paths | none | integrator | clickthrough visitor captures [clickthrough/local/visitor/](evidence/clickthrough/local/visitor/) | verified-complete |

## D. Existing public and authenticated pages

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| About, legal, 404, loading/empty/error, consent, toast | `app.jsx` system pages | `About.tsx`, `Legal*.tsx`, `NotFound.tsx`, `ErrorPage.tsx` | About glyph residual (accepted); the state cells (`app.error.*`, `app.system.empty-search/error/loading/not-found/privacy/terms/toast`) are token-only rows that REPORT lists as UNVERIFIED at every width — token gates passing globally is not per-state proof | integrator | axe state JSONs [axe/](evidence/axe/) (accessibility only); REPORT rows `app.about`, `app.legal`, `app.not-found`, `app.system.*` | needs-repair (`app.about` FAIL 5.08/1.40/1.34/1.00% at 375/768/1024/1440 in the full run); `app.legal` and every `app.system.*`/`app.error.*` state cell remain token-only UNVERIFIED; `app.not-found` BLOCKED |
| Sign-in/sign-up via Clerk (no fake form), return-after-sign-in safe | Clerk | Clerk headless UI + `/^\/(?![/\\])/` next validation | none | integrator | `auth-return-audit` workflow; `app.auth.*` cells | verified-complete |
| Submission protected for guests; authed submit with inline errors, real backend | `app.jsx` Submit | `Submit.tsx` | full run 5.47/2.07/2.19/1.60% at 375/768/1024/1440; remaining delta = field row heights vs reference. The phone 13px restore was rewritten from `:not(.input)` guards to a class-level restore so `canonical-token-parity` keeps parsing it; the 375 cell re-measured identical (5.4684%, run `…07-08-57-394Z-332`) | w-people → integrator | REPORT row `app.submit`; submission clickthrough [clickthrough/local/submission/](evidence/clickthrough/local/submission/) | needs-repair |
| Journeys list/detail, recommendations, bookmarks, collections, profile, notes, onboarding | `app.jsx` where present; documented patterns otherwise | existing pages restyled on tokens | journeys bundle budget passes only under the upstream cap re-baseline (owner decision, not approved here) | integrator | REPORT rows; `guest-recommendations` gate | unverified (`app.journeys`/`app.journey-detail` BLOCKED, the rest token-only UNVERIFIED in the full run) |

## E. Optional resource kinds and featured content

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| Nullable `kind` enum; explicit kind wins; shared tag/category fallback; schema/Zod/serializer/client consistent | merged migration 0047 + resolver | `shared/resourceKinds.ts` single resolver; public serializer choke point | none | integrator | [worklog/kind-api.md](worklog/kind-api.md) gates: openapi 177/177, response-contracts 19/19, mutation probes fail when the field is dropped; [kind-api/](evidence/kind-api/) curl dumps | verified-complete |
| Admin sets/changes/clears kind; persists after reload | — | resource editor kind select | none | integrator | [admin-catalog/verify-ui-resource.json](evidence/admin-catalog/verify-ui-resource.json) + `restore-ui-resource.json` (owned record restored) | verified-complete |
| Featured toggle reflected in Index and Curated positions | `app.jsx` featured rails | admin toggle + home rails | none | integrator | admin-catalog [final-pass/](evidence/admin-catalog/final-pass/) | verified-complete |

## F. Every admin surface

Pixel cells below are the full run `…05-55-50-268Z-6075` unless a later
selected rerun is named; the rest of the inventory is in REPORT. The frozen `admin.jsx` is the reference; live values are
bound through the reference adapter, never faked in production.

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| Overview: stat strip, health chips, activity table | `AdminOverview` | `AdminOverview.tsx` + `admin-overview.css` | 375 fails (9.79%) only because the reference overflows to 400px (see B) | integrator | full run: 768/1024/1440 PASS | verified-complete (375 reference residual) |
| Approvals, Edits queues | `AdminApprovals`, `AdminEdits` | `ApprovalsTab.tsx`, `EditsTab.tsx` | none | w-ops | full run: approvals and edits PASS at all four widths | verified-complete |
| Enrichment | `AdminEnrichment` | `BatchEnrichmentPanel.tsx` + `queues-agent.css` | the ≤48rem rule that forced panel actions onto their own row (the frozen `TableShell` only flex-wraps) made 768 fail at 5.05% in the full run; removed | integrator | full run 375/1024/1440 PASS; 768 re-measured PASS 0.0645% (`…06-59-13-579Z-19499`, after the fix) | verified-complete |
| Researcher | `AdminResearcher` | `ResearcherTab.tsx` | jobs table is live-bound, reference uses the `AV_RESEARCH_JOBS` fixture (not adapter-bound this pass) → row content/height differ at 375 | integrator | full run: 1440 PASS 0.490%; 375 2.54%, 768 2.26%, 1024 0.61% FAIL | needs-repair (≤1024) |
| Export, Database | `AdminExport`, `AdminDatabase` | `ExportTab.tsx`, `DatabaseTab.tsx` | Database seeding disclosure residual (accepted) | w-export-db → integrator | full run: export PASS at all four widths; database 375/1024/1440 PASS, 768 0.53% FAIL (same forced-stacking rule) → re-measured PASS 0.356% after the fix | verified-complete |
| Resources, Categories, Subcategories | `AdminResources`, `AdminCategories`, `AdminSubcategories` | `ResourceManager.tsx`, taxonomy tabs | categories/subcategories: per-row lucide icon glyphs vs the reference's `Icon5` set (icon residual); the same forced-stacking rule failed 768 at 6.78%/5.64% → removed, re-measured 0.60%/0.62% in `…07-03-25-409Z-20621` (still just over); 375 moved 0.68→0.94% / 0.73→0.85% as the header now wraps naturally; the fractional-px `min-width` pins on both tables (`admin-catalog-taxonomy.css`) are hacks by the contract and still to be replaced; 24/page pager residual | w-audit-tax (done) → integrator | full run: resources PASS at all four widths; categories/subcategories 1440 PASS, other widths FAIL (REPORT + selected rerun) | needs-repair (categories/subcategories ≤1024) |
| Users | `AdminUsers` | `UsersTab.tsx` + `admin-ops-users-audit.css` | full run FAIL 4.29/6.64/6.40/0.53% at 375/768/1024/1440. Removing the pinned column shares and `min-width: 52rem` was tried and reverted: 768 stayed 6.6%, 1024 went to 13.3% and 1440 to 2.1%, so the real cause is content, not the pins — the email cell carries the PII toggle button and masks every address while the adapter-bound reference shows some unmasked, changing the auto-layout shares and the date wrap (rows 80 vs 86px) | w-people → integrator | REPORT row `app.admin.users`; rerun `…07-08-57-394Z-332` | needs-repair (all widths) |
| GitHub | `AdminGitHub` | `GitHubSyncPanel.tsx` | 1440 0.549%: live sync copy ("38 sync jobs" vs fixture "47 commits ahead") + tab-strip scroll offset; 375 2.68%: repository heading 8px taller than the reference | integrator | full run: 768 PASS 0.39%, 1440 PASS 0.26%; 375 2.68%, 1024 1.70% FAIL | needs-repair (375/1024) |
| Link Health | `AdminLinkHealth` | `LinkHealthDashboard.tsx` | app renders a truthful empty-state line and a "More" disclosure the fixture-driven reference lacks; the geometry now matches | integrator | full run: 768 PASS 0.39%; 375 6.09%, 1024 0.51%, 1440 0.65% FAIL | needs-repair (product empty state kept by contract) |
| Audit | `AdminAudit` | `AuditTab.tsx` + `admin-ops-audit.css` | none | integrator | full run PASS at all four widths (375 0.0128%, 768 0.0531%, 1024 0.0803%, 1440 0.0582%) | verified-complete |
| Research (notes workspace) | `AdminResearch` | `ResearchWorkspace.tsx` (live-bound) | none | integrator | full run PASS at all four widths | verified-complete |
| Digests, Journeys admin | no frozen counterpart | documented patterns | — | integrator | REPORT rows | unverified |
| Operations persist in dev DB with owned, restored records | — | adapter + admin API | none | integrator | [admin-catalog/verify-ui-resource.json](evidence/admin-catalog/verify-ui-resource.json): record 188015 edited through the UI (`kind: protocols`, `featured: true`) and found again on the listing page; [restore-ui-resource.json](evidence/admin-catalog/restore-ui-resource.json): both fields patched back (`200`) to their `before` values; disposable admin torn down with zero QA users remaining | verified-complete |

## G. Five contact alternatives, default off

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| `VITE_CONTACT_VARIANT=a..e`, unset = none; production off | — | build-time flag, `docs/CONTACT-VARIANTS.md` | none | integrator | [contact-variants/](evidence/contact-variants/) `variant-*-{375,1440}.png`; [footer/contact-disabled.json](evidence/footer/contact-disabled.json) vs `contact-enabled-a.json` | verified-complete |
| b: accessible modal → real rate-limited `/api/contact`; truthful unavailable state | — | `ContactDialog.tsx`, contact retention scheduler | none | integrator | [worklog/contact-api.md](worklog/contact-api.md), [worklog/contact-retention.md](worklog/contact-retention.md); response-contract probes | verified-complete |
| d: per-resource suggest-edit via existing queue; e: palette action | — | existing edit-suggestion queue; cmdk item | none | integrator | contact-variants captures + gates [contact-variants/gates/](evidence/contact-variants/gates/) | verified-complete |

## Cross-cutting decisions recorded this pass

- Auto table layout: any width class, `white-space: nowrap`, `truncate` or
  `min-width` on one cell shifts every column's share; the frozen tables have
  none. Audit 768 went 26% → 0.05% by removing them.
- Pinned fractional pixels from one snapshot are hacks; use the reference's
  natural layout with unitless `1.6` leading.
- App CSS never restyles canonical classes (`.dot`, `.eyebrow`, `.mono`,
  `.muted`, `.input`…) through selectors; add an app-owned class on the
  element instead (`canonical-token-parity` enforces this).
- The iOS zoom guard (16px bare controls under 768px) is followed by a
  class-level restore for canonical `.input/.select/.textarea`, which keep the
  design's 13px at every width. `:not(.input)` guards were rejected by
  `canonical-token-parity`: its element model drops type selectors, so a
  negation-only compound reads as matching every canonical class.
- Panel headers never force their actions onto a second row: the frozen
  `TableShell` only `flex-wrap`s, so a ≤48rem `width: 100%` on the actions
  stacks at 768 where the reference keeps one row (enrichment, database,
  categories, subcategories all failed 768 on this alone).
- Publishing image trim fires only under `REPLIT_PUBLISH_IMAGE_TRIM=1` and
  refuses in the workspace; see [PUBLISH.md](PUBLISH.md).
