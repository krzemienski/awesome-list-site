# Implementation ledger

> **Current acceptance:** [COMPLETION-REVIEW.md](COMPLETION-REVIEW.md) is the
> current independent reconciliation. Overall **NOT COMPLETE**. The matrices
> below retain historical ratings; a functional pass does not certify failed
> or unverified visual acceptance. Fresh scoped repairs/proof and remaining
> conflicts are separated in that review.

## Latest local follow-through

The [parallel product-repair pass](worklog/site-repair-2026-09-17.md) records
the subsequent source repairs and built-in browser journeys, including all
admin tabs, resource persistence, pointer deletion, and collection/note
persistence. It does not claim a new full pixel certification.

The [2026-09-17 parallel redesign report](worklog/redesign-resume-2026-09-17.md)
records repairs and focused live proof on the working tree based on `a09ad484`.
It supersedes the exact-768 defect and taxonomy-intro regression for those
verified scenarios, but does **not** replace the historical full pixel results
below or certify unexecuted account/admin persistence flows.

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
`2026-09-17T00-31-04-404Z-444` ([STATUS.md](STATUS.md), [REPORT.md](REPORT.md):
**159 pass / 25 fail** of **184** executed pixel rows, 40 blocked, 4 aliases, gate
**NOT PASSED**). Earlier full runs on this candidate line: 16/172 → 56/128 →
83/101 (`…20-05-21-890Z-49182`) → 159/25. This run tore its disposable admin
down cleanly (0 `__qa_test_parity_` rows remaining) and recorded no document
reloads or font-readiness reopens; every one of the 188 captured rows declared
identical `@font-face` sets on both sides (0 font gaps). It still recorded
`Inputs changed during run: YES — stale` because live catalog/admin adapter
hashes move while the run captures, so it locates defects and measures the
candidate's own tree, but is not a byte-exact proof of a committed SHA.

The 25 failing cells are all named residuals below: 13 app cells (overview 375
reference overflow; linkhealth 375 and users 375 product residuals kept by
contract; researcher ≤1024 live jobs vs fixture; categories/subcategories ≤1024
icon set + live counts; github 375 live sync rows at 0.518%) and 12 artifact
cells (`artifact.docs.buttons`, `artifact.docs.forms`, `artifact.showcase` at
every width) that differ only where the artifact keeps the 44px accessible
control floor the frozen docs page does not have — see the cross-cutting
decisions.

## A. Theme foundations and five design systems

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| Five systems × ten accents selectable at `/settings/theme`, systems change typography/geometry/motion | `styles.css` system skin blocks; `app.jsx` theme page | `client/src/styles/design-system.css` skin blocks + registry (`client/src/lib/theme/*`) | none found | integrator | 50/50 combinations, 0 failures, re-proven 2026-09-17 with persistence across reload and a long category page: [tokens/50-combo-2026-09-17/](evidence/tokens/50-combo-2026-09-17/) (earlier [tokens/50-combo-results.json](evidence/tokens/50-combo-results.json)); per-system captures [multi-system/](evidence/multi-system/) (`audit-567-summary.json` phases theme/runtime/smoke/axe/font-prepaint all COMPLETE) | verified-complete |
| Token registry enumerated from source, not prose counts | `styles.css` `:root` | `canonical-tokens.json` + `canonical-token-parity` gate (effective cascade resolver) | none | integrator | gate PASS in validation run `beVZ6foyuPqgD5DGI91O3` and after `4f5e8968`; mutation probes in [tokens/gate-mutations.md](evidence/tokens/gate-mutations.md) | verified-complete |
| Theme applied before first paint, CSP + SSR intact, manual accent preserved across system switches, stale values/reload/denied storage | `app.jsx` theme boot | pre-boot inline theme script (nonce'd) + storage guards | none | integrator | filmstrips [tokens/filmstrip.md](evidence/tokens/filmstrip.md), `font-prepaint` gate PASS, theme-registry-types PASS | verified-complete |
| Real font families/weights per system; ONE canonical Google Fonts request in the app shell | `index.html` css2 link | shell `<link>` byte-identical to the design's nine-family URL; `accent-drift` `canonical-font-request` check | none | integrator | [worklog/fonts.md](worklog/fonts.md) gates table: webfont-fetch 6/6 200, 190 `@font-face`; font-set before/after in [fonts/](evidence/fonts/) | verified-complete |
| Design-system preview renders headings with the same font files as the live site | `index.html` css2 link | Artifact now uses the single static canonical nine-family URL on showcase and docs; the narrower docs override was removed | Frozen docs still declare fewer faces than the live canonical request | integrator | Fresh native Showcase/Docs/Typography navigation, Editorial/Terminal loaded heading faces and reload persistence; [completion review](COMPLETION-REVIEW.md) and retained font comparison | functional verification passed; frozen-doc declaration parity unresolved |
| `.page` atmosphere + `.grain`; body ink not metadata ink; accent discipline; chart ink ramps | `styles.css` `.page::after`, `.grain` | `.page::after` clipped by per-system token (raster budget); `accent-drift` + `palette-drift` gates | none | integrator | gates PASS after `4f5e8968`; ink review [worklog/audit-567-ds-verdicts.md](worklog/audit-567-ds-verdicts.md) | verified-complete |

## B. Application shell

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| Sticky 60px header, brand left, controls right, blur, responsive | `layout.jsx` header | `AppHeader.tsx` + `shell.css` + `styles/shell/header.css` | the 2.3–5.4% band was an auth-state mismatch (expected strips are the signed-in admin fixture, the app strips were captured signed out) plus three controls painting below the 44px floor; repaired 2026-09-17 with 44px hit targets drawn as transparent pseudo-elements around the frozen 36px paint. Remaining 0.36–0.70% is raster rounding of fresh captures (e.g. a 74.08px pill vs the 74px expected raster), not displacement — see [worklog/header-repair-2026-09-17.md](worklog/header-repair-2026-09-17.md) | integrator | state-matched (signed-in admin) [shell-header/repair-2026-09-17/authenticated/results.json](evidence/shell-header/repair-2026-09-17/authenticated/results.json): 375 5.37→0.70%, 768 2.70→0.36%, 1024 2.33→0.55%, 1440 2.67→0.52%; `canonical-token-parity`, `accent-drift`, `palette-drift` PASS | partially verified: 768 PASS; 375/1024/1440 remain 0.02–0.20pt over the 0.5% ceiling (raster-only per the worklog, **not waived** — still a threshold miss) |
| Four-column footer → two → one, working destinations | `layout.jsx` footer | `AppFooter.tsx` | none | integrator | [footer/results.json](evidence/footer/results.json): columns 4/4/2/1 at 1440/1024/768/375, no overflow, every href 200, axe clean; `footer-*.png` | verified-complete |
| Sidebar 280 desktop / 240 tablet / drawer <768; tablet sidebar at 768 | `layout.jsx` sidebar | `AppSidebar.tsx` | the exact-768 drawer was fixed 2026-09-17 (`ui/sidebar.tsx` + `sidebar.css`; 240px static sidebar at 768, drawer below); `tablet-audit.mjs` now asserts 767/768 and drawer coexistence | w-public → integrator | [sidebar/RESULTS.md](evidence/sidebar/RESULTS.md) (pre-fix: absent@768) superseded by [redesign-resume-2026-09-17](worklog/redesign-resume-2026-09-17.md) 375/767/768/1024 captures: none/none/240/240, no duplicate disclosure IDs at 768 | verified-complete |
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
| Category / subcategory / sub-subcategory layouts, breadcrumbs, counts, pagination, SSR parity | `app.jsx` Category | `CategoryPage.tsx` family, 24/page lockstep | `app.subsubcategory` is token-only (UNVERIFIED); reference pager binds first listing page only (accepted residual) | w-public → integrator | full run `…20-05-21-890Z-49182`: `app.category` PASS 0.072/0.042/0.137/0.152% and `app.subcategory` PASS 0.116/0.116/0.144/0.176% at 375/768/1024/1440; taxonomy-listing-parity gate PASS | verified-complete (`app.subsubcategory` token-only) |
| Resource detail: real content, bookmark/collection/notes/edit/external link; no placeholder rows | `app.jsx` ResourcePage | `ResourceDetail.tsx` + `resource.css` (secondary sections behind "More") | "More" disclosure for secondary sections is an accepted residual | integrator | [resource-detail/](resource-detail/) worklog; full run `…20-05-21-890Z-49182`: PASS 0.475/0.283/0.078/0.442% at 375/768/1024/1440 | verified-complete |
| Search: real results, no-results, clear/reset, query state, Back/Forward | `app.jsx` Search | `SearchPage.tsx` | `app.search` cell BLOCKED in harness (reference has no bound search state) | integrator | `search-typos` gate; URL-sync popstate fix (memory) | unverified (pixel blocked) |
| RIST / MPEG & Forums / Official Specs error screens investigated | — | routes render; historical failures were rate-limit (edge 429) and reserved-character paths | none | integrator | clickthrough visitor captures [clickthrough/local/visitor/](evidence/clickthrough/local/visitor/) | verified-complete |

## D. Existing public and authenticated pages

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| About, legal, 404, loading/empty/error, consent, toast | `app.jsx` system pages | `About.tsx`, `Legal*.tsx`, `NotFound.tsx`, `ErrorPage.tsx` | About glyph residual (accepted); the state cells (`app.error.*`, `app.system.empty-search/error/loading/not-found/privacy/terms/toast`) are token-only rows that REPORT lists as UNVERIFIED at every width — token gates passing globally is not per-state proof | integrator | axe state JSONs [axe/](evidence/axe/) (accessibility only); REPORT rows `app.about`, `app.legal`, `app.not-found`, `app.system.*` | `app.about` PASS 0.321/0.240/0.121/0.084% at 375/768/1024/1440 in full run `…20-05-21-890Z-49182`; 2026-09-17 real-browser state captures at 1280 for not-found, empty search, populated search (`hls`), privacy and terms in [redesign-resume-2026-09-17/system-states/](evidence/redesign-resume-2026-09-17/system-states/) (rendered-state proof, not pixel parity); loading/error/toast cells remain token-only UNVERIFIED |
| Sign-in/sign-up via Clerk (no fake form), return-after-sign-in safe | Clerk | Clerk headless UI + `/^\/(?![/\\])/` next validation | none | integrator | `auth-return-audit` workflow; `app.auth.*` cells | verified-complete |
| Submission protected for guests; authed submit with inline errors, real backend | `app.jsx` Submit | `Submit.tsx` | none (the phone 13px restore is a class-level rule so `canonical-token-parity` keeps parsing it) | w-people → integrator | full run `…20-05-21-890Z-49182`: PASS 0.476/0.292/0.073/0.060% at 375/768/1024/1440; submission clickthrough [clickthrough/local/submission/](evidence/clickthrough/local/submission/) | verified-complete |
| Journeys list/detail, recommendations, bookmarks, collections, profile, notes, onboarding | `app.jsx` where present; documented patterns otherwise | existing pages restyled on tokens | journeys bundle budget passes only under the upstream cap re-baseline (owner decision, not approved here) | integrator | REPORT rows; `guest-recommendations` gate; built-in browser tester 2026-09-17 (member flows, disposable Clerk member `__qa_test_member_*`): collection create → rename → delete, bookmark + note add/edit/remove with persistence across reload, all restored to baseline; recorded in [CLICKTHROUGH.md](CLICKTHROUGH.md) § 2026-09-17 member/admin flows | functionally verified (collections/bookmarks/notes); pixel cells still token-only UNVERIFIED |

## E. Optional resource kinds and featured content

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| Nullable `kind` enum; explicit kind wins; shared tag/category fallback; schema/Zod/serializer/client consistent | merged migration 0047 + resolver | `shared/resourceKinds.ts` single resolver; public serializer choke point | none | integrator | [worklog/kind-api.md](worklog/kind-api.md) gates: openapi 177/177, response-contracts 19/19, mutation probes fail when the field is dropped; [kind-api/](evidence/kind-api/) curl dumps | verified-complete |
| Admin sets/changes/clears kind; persists after reload | — | resource editor kind select | none | integrator | [admin-catalog/verify-ui-resource.json](evidence/admin-catalog/verify-ui-resource.json) + `restore-ui-resource.json` (owned record restored); re-proven 2026-09-17 by the built-in tester on a run-owned record (188450, later deleted): set `Protocols` + featured → save → reload → persisted → clear kind (`Use inferred — resolved: other`) → save → reload → persisted, featured card + `FEATURED 1` visible on the curated home | verified-complete |
| Featured toggle reflected in Index and Curated positions | `app.jsx` featured rails | admin toggle + home rails | none | integrator | admin-catalog [final-pass/](evidence/admin-catalog/final-pass/) | verified-complete |

## F. Every admin surface

Pixel cells below are the full run `…00-31-04-404Z-444` (all four widths, admin
identity) unless a later selected rerun is named; the rest of the inventory is in REPORT. The frozen `admin.jsx` is the reference; live values are
bound through the reference adapter, never faked in production.

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| Overview: stat strip, health chips, activity table | `AdminOverview` | `AdminOverview.tsx` + `admin-overview.css` | 375 fails (9.81%) only because the reference overflows to 400px (see B) | integrator | full run: 768/1024/1440 PASS 0.047/0.072/0.075% | verified-complete (375 reference residual) |
| Approvals, Edits queues | `AdminApprovals`, `AdminEdits` | `ApprovalsTab.tsx`, `EditsTab.tsx` | none | w-ops | full run: approvals and edits PASS at all four widths | verified-complete |
| Enrichment | `AdminEnrichment` | `BatchEnrichmentPanel.tsx` + `queues-agent.css` | the ≤48rem rule that forced panel actions onto their own row (the frozen `TableShell` only flex-wraps) made 768 fail at 5.05% in the full run; removed | integrator | full run: PASS at all four widths (0.106/0.062/0.070/0.056%) | verified-complete |
| Researcher | `AdminResearcher` | `ResearcherTab.tsx` | jobs table is live-bound, reference uses the `AV_RESEARCH_JOBS` fixture (not adapter-bound this pass); the fixture's one-token dates (`2/11/2026`) never wrap where the live `formatAdminDate` output did, so live rows measured 56px against the fixture's 66px — the created-at cell now carries an app-owned `queues-agent__cell-created { white-space: nowrap }` (scoped to that one cell: applying it to the shared muted-cell class regressed enrichment 375 from 0.106% to 5.25% because enrichment's fixture dates wrap) | integrator | full run: 1440 PASS 0.490%; 375 0.816%, 768 0.754%, 1024 0.612% FAIL (from 2.54/2.26/0.61%) — the remaining band is live job rows (prompt, counts, cost) vs the fixture's two canned rows; the product keeps showing real jobs | verified-complete (≤1024 live-fixture residual, 0.61–0.82%) |
| Export, Database | `AdminExport`, `AdminDatabase` | `ExportTab.tsx`, `DatabaseTab.tsx` | Database seeding disclosure residual (accepted) | w-export-db → integrator | full run: export and database PASS at all four widths (database 0.488/0.356/0.322/0.235%) | verified-complete |
| Resources, Categories, Subcategories | `AdminResources`, `AdminCategories`, `AdminSubcategories` | `ResourceManager.tsx`, taxonomy tabs | categories/subcategories: per-row lucide icon glyphs vs the reference's unicode `Icon5` set (◈◇◆▣▤) and live resource counts vs the fixture (e.g. 333 vs 338) — text positions are identical; the fractional-px `min-width` pins in `admin-catalog-taxonomy.css` were removed (no pixel effect either way); 24/page pager residual | w-audit-tax (done) → integrator | full run: resources PASS at all four widths; categories 1440 PASS 0.393%, 375/768/1024 FAIL 0.679/0.600/0.508%; subcategories 1440 PASS 0.229%, 375/768/1024 FAIL 0.732/0.621/0.668% — the residual bands are the icon glyphs plus live counts | verified-complete (≤1024 icon-set + live-count residual, 0.51–0.73%); **hitbox defect fixed 2026-09-17** — the hover-revealed delete control in the resources and taxonomy tables was `position:absolute` with no offsets, so at rest it sat over Edit (still receiving pointer events) and flipped to static on hover, sliding Edit under the pointer: clicking Edit opened Delete Resource. It now anchors out of flow left of View/Edit, is inert until row hover or focus-within, and never re-flows the visible buttons (`admin-catalog-resources.css`, `admin-catalog-taxonomy.css`; the new rules apply only under hover/focus/tools-open, so the resting composition is unchanged by construction — the no-hover pixel harness was not rerun after this edit). Pointer-only re-verification by the built-in tester: Edit → Edit dialog, trash → Delete confirmation / disabled "Cannot delete" state, on both tables |
| Users | `AdminUsers` | `UsersTab.tsx` + `admin-ops-users-audit.css` | 375 FAIL 3.58%: the app's horizontal-scroll swipe hint (kept by contract) vs the reference's clipped table; the earlier 768/1024 gap was (a) the shared `.admin-ops-status-chip` primitive shrinking the role chip — the frozen `.chip` metrics are now scoped to `.admin-ops-cell-role`, the old `.admin-chip` rule was dead — and (b) muted ink on nameless-account names, which the frozen `td` never applies; 769–1100px column shares re-pinned to the frozen auto-layout boxes | w-people → integrator | full run: 768 PASS 0.031%, 1024 PASS 0.471%, 1440 PASS 0.133%; 375 FAIL 3.58% (2.97–3.58% across runs — the live user list changes) | verified-complete (375 swipe-hint residual) |
| GitHub | `AdminGitHub` | `GitHubSyncPanel.tsx` | live sync copy/metadata vs the fixture (accepted); 375 0.518% is 0.018pt over the ceiling — the tab strip's reveal effect used to re-scroll during the full-page capture (its ResizeObserver now disconnects after the first reveal, probe: scrollLeft 1102 before/after capture); the remaining band is the live sync-history rows | integrator | full run: 768 PASS 0.295%, 1024 PASS 0.281%, 1440 PASS 0.201%; 375 FAIL 0.518% (stable to the third decimal across three full runs) | verified-complete (375 live sync-rows residual, 0.518%) |
| Link Health | `AdminLinkHealth` | `LinkHealthDashboard.tsx` | app renders a truthful empty-state line and a "More" disclosure the fixture-driven reference lacks; the geometry now matches | integrator | full run: 768 PASS 0.171%, 1024 PASS 0.222%, 1440 PASS 0.129%; 375 FAIL 5.19% (empty-state line + "More" row stack at phone width) | verified-complete (375 product residual kept by contract) |
| Audit | `AdminAudit` | `AuditTab.tsx` + `admin-ops-audit.css` | none | integrator | full run PASS at all four widths (375 0.0128%, 768 0.0565%, 1024 0.0789%, 1440 0.0591%) | verified-complete |
| Research (notes workspace) | `AdminResearch` | `ResearchWorkspace.tsx` (live-bound) | none | integrator | full run PASS at all four widths | verified-complete |
| Digests, Journeys admin | no frozen counterpart | documented patterns | — | integrator | REPORT rows; built-in tester 2026-09-17: Settings menu → Journeys panel (5 journeys × 6 steps, Steps dialog open/close, no edits) and Digests panel (delivery health: transport Available, queue 0, no failure codes); Users tab lists the disposable member with its role | functionally verified (no frozen pixel reference) |
| Operations persist in dev DB with owned, restored records | — | adapter + admin API | none | integrator | [admin-catalog/verify-ui-resource.json](evidence/admin-catalog/verify-ui-resource.json): record 188015 edited through the UI (`kind: protocols`, `featured: true`) and found again on the listing page; [restore-ui-resource.json](evidence/admin-catalog/restore-ui-resource.json): both fields patched back (`200`) to their `before` values; disposable admin torn down with zero QA users remaining | verified-complete; 2026-09-17 tester pass adds: submission `__qa_test_sub_*` invalid → inline errors, valid → pending → approved via Approvals → public `/resource/188450` → kind/featured edited → deleted through Admin Resources (row gone, count back to baseline); category `__qa_test_cat_*` (id 1387) created → renamed → deleted, count back to 9; disposable member row kept with role reset to `user` |

## G. Five contact alternatives, default off

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| `VITE_CONTACT_VARIANT=a..e`, unset = none; production off | — | build-time flag, `docs/CONTACT-VARIANTS.md` | none | integrator | [contact-variants/](evidence/contact-variants/) `variant-*-{375,1440}.png`; [footer/contact-disabled.json](evidence/footer/contact-disabled.json) vs `contact-enabled-a.json`; rerun on this candidate 2026-09-17 (a–e, e fallback, unset all PASS; harness selectors updated for the redesigned home rail and the resource page's More disclosure, no product change) in [contact-variants/rerun-2026-09-17/](evidence/contact-variants/rerun-2026-09-17/) | verified-complete |
| b: accessible modal → real rate-limited `/api/contact`; truthful unavailable state | — | `ContactDialog.tsx`, contact retention scheduler | none | integrator | [worklog/contact-api.md](worklog/contact-api.md), [worklog/contact-retention.md](worklog/contact-retention.md); response-contract probes | verified-complete |
| d: per-resource suggest-edit via existing queue; e: palette action | — | existing edit-suggestion queue; cmdk item | none | integrator | contact-variants captures + gates [contact-variants/gates/](evidence/contact-variants/gates/) | verified-complete |

## Cross-cutting decisions recorded this pass

- Contract-over-reference residuals (full run
  `2026-09-17T11-42-39-272Z-11572`, 133/51, see the
  [third pass](worklog/redesign-resume-2026-09-17.md#third-pass-later-on-2026-09-17-full-pixel-run-and-the-50-combinations)):
  where the execution contract names a behaviour the frozen prototype does not
  paint, the behaviour wins and the pixel rows it costs are recorded here, not
  waived. (1) The 240px tablet sidebar at exactly 768 (contract) versus the
  reference's `max-width:768px` hide fails `app.home.index`,
  `app.home.curated`, `app.shell.mobile-drawer`, `app.shell.palette`,
  `app.category`, `app.subcategory` at 768. (2) The artifact fitting a 375
  viewport (contract: no sideways overflow) versus reference docs/showcase
  captures 389–920px wide fails the artifact docs chapters at 375,
  `artifact.docs.integration` 768/1024 and raises `artifact.showcase` 375.
  `artifact.docs.color` and `artifact.docs.lists` still overflowed (405/495px)
  after that pass; the fix followed the showcase's existing pattern (the docs'
  anatomy row reuses `.ds-list-row`, the ink ramp gets `.ds-ink-row`, both
  reflowing under 480px in the artifact's `index.css`), and all thirteen docs
  chapters now fit at 375/768/1024/1440. (3) `app.category` 375/1024/1440 prints the
  crawler-parity `scopeIntro` where the reference binds the nav teaser (one
  line shorter) and keeps the inactive Home link readable instead of the
  prototype's default-button white box. Below category level the intro is
  screen-reader-only, which returned `app.subcategory` 375/1024/1440 to PASS.
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
- The artifact keeps the 44px accessible-target floor
  (`--profile-control-height`) on docs and showcase controls where the frozen
  docs page renders 26–36px controls. Removing the floor takes
  `artifact.docs.buttons` / `artifact.docs.forms` / `artifact.showcase` to
  ≈0.02% but breaks the hit-area contract recorded in ASSUMPTIONS.md,
  ARCHIVE-REVIEW.md and DESIGN-SYNC.md, and the `product-profile-drift` gate
  asserts that token per selector; pseudo-element hit areas were rejected
  (inputs cannot carry them, swatches/pills would overlap). The 12 artifact
   cells that failed (1.1–2.9% on docs, 5.3–23.6% on the showcase, all at the
   control rows) remain unresolved visual acceptance, not an approved waiver.
- The earlier per-view font-request decision is superseded: the explicit
   live/artifact file-parity requirement now uses one static canonical
   nine-family URL in every artifact view. Fresh loaded-heading checks pass;
   the frozen docs' omitted IBM Plex Sans declarations cause a distinct
   declared-face comparison conflict. See COMPLETION-REVIEW.md. Do not restore
   the narrower request merely to hide that conflict or claim first-paint
   timing from a loaded-font check.
- Table fixes stay on the one cell that needs them. A `white-space: nowrap`
  added to the shared `.queues-agent__cell-muted` for the researcher date
  column regressed enrichment 375 from 0.106% to 5.25% because the enrichment
  fixture wraps its dates; the rule now lives on an app-owned
  `queues-agent__cell-created` class on that cell only.
- The shell breadcrumb is `sr-only` (pages own their visible crumbs), so the
  `responsive-audit` phone breadcrumb checks assert accessibility-tree
  membership instead of a visible width: Playwright `getByRole` must resolve
  the breadcrumb navigation and the `role="link"` / `aria-current="page"`
  crumb by accessible name, the nav's ARIA snapshot must name it, and an
  in-page walk of every ancestor must find no `display:none`,
  `visibility:hidden`, `aria-hidden`, `hidden` or `inert` (a mutation probe
  showed `getByRole` alone still counts a crumb under an `inert` ancestor —
  hence both probes); 320 additionally requires zero horizontal overflow. `.accordion-header { border: 0 }` out-specified
  the global forced-colors button border; a forced-colors-only override in
  `sidebar.css` restores it with no pixel effect outside High Contrast.
