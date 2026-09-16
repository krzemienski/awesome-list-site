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

Latest partial runs cited below were taken on 2026-09-16 after commits
`745a1a8c`, `4f5e8968` and `621d4409`. The last full-inventory run
([STATUS.md](STATUS.md)) predates them; the full rerun scheduled after this
ledger replaces STATUS/REPORT and this ledger's "Status" column must be
re-read against it.

## A. Theme foundations and five design systems

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| Five systems × ten accents selectable at `/settings/theme`, systems change typography/geometry/motion | `styles.css` system skin blocks; `app.jsx` theme page | `client/src/styles/design-system.css` skin blocks + registry (`client/src/lib/theme/*`) | none found | integrator | 50/50 combinations, 0 failures: [tokens/50-combo-results.json](evidence/tokens/50-combo-results.json); per-system captures [multi-system/](evidence/multi-system/) (`audit-567-summary.json` phases theme/runtime/smoke/axe/font-prepaint all COMPLETE) | verified-complete |
| Token registry enumerated from source, not prose counts | `styles.css` `:root` | `canonical-tokens.json` + `canonical-token-parity` gate (effective cascade resolver) | none | integrator | gate PASS in validation run `beVZ6foyuPqgD5DGI91O3` and after `4f5e8968`; mutation probes in [tokens/gate-mutations.md](evidence/tokens/gate-mutations.md) | verified-complete |
| Theme applied before first paint, CSP + SSR intact, manual accent preserved across system switches, stale values/reload/denied storage | `app.jsx` theme boot | pre-boot inline theme script (nonce'd) + storage guards | none | integrator | filmstrips [tokens/filmstrip.md](evidence/tokens/filmstrip.md), `font-prepaint` gate PASS, theme-registry-types PASS | verified-complete |
| Real font families/weights per system; ONE canonical Google Fonts request; same files in the DS preview | `index.html` css2 link | shell `<link>` byte-identical to the design's nine-family URL; `accent-drift` `canonical-font-request` check | DS preview heading fonts tracked separately (proposed task) | integrator | [worklog/fonts.md](worklog/fonts.md) gates table: webfont-fetch 6/6 200, 190 `@font-face`; font-set before/after in [fonts/](evidence/fonts/) | verified-complete |
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
| Ctrl/⌘-K palette: open, type, results, keyboard select, navigate, Escape | `layout.jsx` palette | `CommandPalette.tsx` (cmdk) | none | integrator | keyboard clickthrough [clickthrough/keyboard-desktop-final/](evidence/clickthrough/keyboard-desktop-final/); `app.shell.palette` cell in REPORT | verified-complete |
| No duplicate nav, sideways overflow, sticky failures, footer/consent overlap | — | `overflow: clip` shell, single header search | reference itself overflows to 400px at 375 on admin overview (`minmax(360px,1fr)` grid, `admin.jsx:121`); app deliberately stays within 375 | integrator | sticky-preview audit 7/7; overview 375 pair `2026-09-16T05-32-47-908Z-2440` (expected 400×1999 vs actual 375×2028) | verified-complete (documented reference residual) |

## C. Home, taxonomy, resource and search

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| Index default home + selectable Curated, real data, distinct composition | `app.jsx` Home/Curated | `Home.tsx` (`?layout=curated`) | none | integrator | `app.home.index` 375 PASS 0.171% (`2026-09-16T05-49-06-052Z-5183`); desktop cells in REPORT | verified-complete at 375; other widths per full run |
| Home filters with live counts, clear/reset, empty, featured, kind strip | `app.jsx` filter strip | `HomeFilterStrip.tsx` + `/api/resources/counts` | none | integrator | [kind-api/curl-counts.txt](evidence/kind-api/curl-counts.txt) 1816 == DB; `curl-kind-filter.txt` 0 mismatches; `app.system.empty-search` cells | verified-complete |
| Category / subcategory / sub-subcategory layouts, breadcrumbs, counts, pagination, SSR parity | `app.jsx` Category | `CategoryPage.tsx` family, 24/page lockstep | subsubcategory cells were 74–83% in the last full run (wrong composition, see STATUS); reference pager binds first listing page only (accepted residual) | w-public → integrator | REPORT rows `app.category`, `app.subcategory`, `app.subsubcategory`; taxonomy-listing-parity gate PASS | needs-repair |
| Resource detail: real content, bookmark/collection/notes/edit/external link; no placeholder rows | `app.jsx` ResourcePage | `ResourceDetail.tsx` + `resource.css` (secondary sections behind "More") | last full run 65–68% at 1024/1440 before `3963b428`; needs the full rerun to confirm the reworked layout | integrator | [resource-detail/](resource-detail/) worklog; full run pending | unverified |
| Search: real results, no-results, clear/reset, query state, Back/Forward | `app.jsx` Search | `SearchPage.tsx` | `app.search` cell BLOCKED in harness (reference has no bound search state) | integrator | `search-typos` gate; URL-sync popstate fix (memory) | unverified (pixel blocked) |
| RIST / MPEG & Forums / Official Specs error screens investigated | — | routes render; historical failures were rate-limit (edge 429) and reserved-character paths | none | integrator | clickthrough visitor captures [clickthrough/local/visitor/](evidence/clickthrough/local/visitor/) | verified-complete |

## D. Existing public and authenticated pages

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| About, legal, 404, loading/empty/error, consent, toast | `app.jsx` system pages | `About.tsx`, `Legal*.tsx`, `NotFound.tsx`, `ErrorPage.tsx` | About glyph residual (accepted) | integrator | axe state JSONs [axe/app.system.*](evidence/axe/); REPORT rows `app.system.*`, `app.error.*` | verified-complete (per last full run: system cells were among the 16 passes) |
| Sign-in/sign-up via Clerk (no fake form), return-after-sign-in safe | Clerk | Clerk headless UI + `/^\/(?![/\\])/` next validation | none | integrator | `auth-return-audit` workflow; `app.auth.*` cells | verified-complete |
| Submission protected for guests; authed submit with inline errors, real backend | `app.jsx` Submit | `Submit.tsx` | 375 pixel 5.47% (was 13.16%) after canonical controls kept 13px on phones; remaining delta = field row heights vs reference | w-people → integrator | `app.submit` 375 `2026-09-16T05-49-06-052Z-5183`; submission clickthrough [clickthrough/local/submission/](evidence/clickthrough/local/submission/) | needs-repair |
| Journeys list/detail, recommendations, bookmarks, collections, profile, notes, onboarding | `app.jsx` where present; documented patterns otherwise | existing pages restyled on tokens | journeys bundle budget passes only under the upstream cap re-baseline (owner decision, not approved here) | integrator | REPORT rows; `guest-recommendations` gate | unverified (pending full run) |

## E. Optional resource kinds and featured content

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| Nullable `kind` enum; explicit kind wins; shared tag/category fallback; schema/Zod/serializer/client consistent | merged migration 0047 + resolver | `shared/resourceKinds.ts` single resolver; public serializer choke point | none | integrator | [worklog/kind-api.md](worklog/kind-api.md) gates: openapi 177/177, response-contracts 19/19, mutation probes fail when the field is dropped; [kind-api/](evidence/kind-api/) curl dumps | verified-complete |
| Admin sets/changes/clears kind; persists after reload | — | resource editor kind select | none | integrator | [admin-catalog/verify-ui-resource.json](evidence/admin-catalog/verify-ui-resource.json) + `restore-ui-resource.json` (owned record restored) | verified-complete |
| Featured toggle reflected in Index and Curated positions | `app.jsx` featured rails | admin toggle + home rails | none | integrator | admin-catalog [final-pass/](evidence/admin-catalog/final-pass/) | verified-complete |

## F. Every admin surface

Pixel cells below are the latest partial runs (2026-09-16); the rest of the
inventory is in REPORT. The frozen `admin.jsx` is the reference; live values are
bound through the reference adapter, never faked in production.

| Requirement | Original source | Current implementation | Missing/broken behavior | Owner | Real-browser proof | Status |
|---|---|---|---|---|---|---|
| Overview: stat strip, health chips, activity table | `AdminOverview` | `AdminOverview.tsx` + `admin-overview.css` | 375 fails only because the reference overflows to 400px (see B) | integrator | 1440 PASS 0.0795% (`…05-32-47-908Z-2440`); earlier 0.0744% | verified-complete (375 reference residual) |
| Approvals, Edits queues | `AdminApprovals`, `AdminEdits` | `ApprovalsTab.tsx`, `EditsTab.tsx` | — | w-ops | verified PASS earlier this session (all widths); full run confirms | verified-complete |
| Enrichment | `AdminEnrichment` | `BatchEnrichmentPanel.tsx` + `queues-agent.css` | none | integrator | 375 PASS 0.109%, 1440 PASS 0.057% (`…05-43-30-334Z-4294`) | verified-complete |
| Researcher | `AdminResearcher` | `ResearcherTab.tsx` | jobs table is live-bound, reference uses the `AV_RESEARCH_JOBS` fixture (not adapter-bound this pass) → row content/height differ at 375 | integrator | 1440 PASS 0.490%, 375 FAIL 2.54% (`…05-43-30-334Z-4294`) | needs-repair (375) |
| Export, Database | `AdminExport`, `AdminDatabase` | `ExportTab.tsx`, `DatabaseTab.tsx` | Database seeding disclosure residual (accepted) | w-export-db → integrator | export 375 PASS 0.231% (`…05-49-06-052Z-5183`); database all widths ≤0.489% (session runs) | verified-complete |
| Resources, Categories, Subcategories | `AdminResources`, `AdminCategories`, `AdminSubcategories` | `ResourceManager.tsx`, taxonomy tabs | categories 375 = 0.68%: per-row lucide icon glyphs vs the reference's `Icon5` set (icon residual); 24/page pager residual | w-audit-tax (done) → integrator | resources 375 PASS 0.233%; categories 375 FAIL 0.679% (`…05-49-06-052Z-5183`); subcategories verified earlier | needs-repair (categories 375 icon set) |
| Users | `AdminUsers` | `UsersTab.tsx` + `admin-ops-users-audit.css` | pinned percentage column widths + `inline-flex` email wrapper (`text-sm`) keep the reference's auto-layout from reflowing at 375: rows 80px vs 86px | w-people → integrator | 375 FAIL 4.29% (`…05-38-18-968Z-3528`) | needs-repair (375) |
| GitHub | `AdminGitHub` | `GitHubSyncPanel.tsx` | 1440 0.549%: live sync copy ("38 sync jobs" vs fixture "47 commits ahead") + tab-strip scroll offset; 375 2.68%: repository heading 8px taller than the reference | integrator | 375/1440 `…05-43-30-334Z-4294`, `…05-49-06-052Z-5183` | needs-repair |
| Link Health | `AdminLinkHealth` | `LinkHealthDashboard.tsx` | app renders a truthful empty-state line and a "More" disclosure the fixture-driven reference lacks; the geometry now matches | integrator | 1440 PASS 0.351%; 375 FAIL 6.33% (`…05-49-06-052Z-5183`) | needs-repair (375, product empty state kept by contract) |
| Audit | `AdminAudit` | `AuditTab.tsx` + `admin-ops-audit.css` | none | integrator | 375 0.0128%, 768 0.0531%, 1024 0.0803%, 1440 0.0582% | verified-complete |
| Research (notes workspace) | `AdminResearch` | `ResearchWorkspace.tsx` (live-bound) | none | integrator | 0.0185% (session run) | verified-complete |
| Digests, Journeys admin | no frozen counterpart | documented patterns | — | integrator | REPORT rows | unverified |
| Operations persist in dev DB with owned, restored records | — | adapter + admin API | none | integrator | [admin-catalog/cleanup-owned-identities.json](evidence/admin-catalog/cleanup-owned-identities.json) | verified-complete |

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
- The iOS zoom guard (16px inputs under 768px) now exempts canonical
  `.input/.select/.textarea`, which keep the design's 13px at every width.
- Publishing image trim fires only under `REPLIT_PUBLISH_IMAGE_TRIM=1` and
  refuses in the workspace; see [PUBLISH.md](PUBLISH.md).
