# Bug hunt report — awesome.video (dev workspace)

- **Target**: http://127.0.0.1:5000 (development app; fixes land here first, prod follows on publish)
- **Date**: 2026-08-20
- **Stated purpose**: find at least 25 distinct bugs across admin panel + public UI/UX/usability, then fix them
- **Stop condition**: bug-quota 25 (met: 29 confirmed)
- **Mode**: parallel (4 hunter subagents + lead verification), then parallel (4 fixer subagents)
- **Driver**: playwright

> Deviation from template: this was a combined find-AND-fix run, so each bug carries a **Resolution** instead of a fix prompt. Every fix was re-verified at the originally audited surface.

## Summary

| Metric | Value |
|--------|-------|
| Partitions hunted | admin-core, admin-ops, public-browse, public-engage |
| Candidates filed | 32 |
| Refuted by lead verification | 1 (PB-P-06: awesome-list tree "missing 355 resources" — independent recount found all 1,816 present) |
| Cross-partition duplicates merged | 2 (journey-6 triplication found by 2 hunters, 3 filings) |
| **Bugs confirmed & fixed** | **29** (1 high / 14 medium / 14 low) |
| Viewports | desktop 1440×900, tablet 768×1024, mobile 375×667 |
| Reproduction standard | 2/2 per bug, evidence per finding |
| Post-fix verification | per-surface re-checks + full gate suite (see Verification) |

### Bug index

| ID | Severity | Title | Where |
|----|----------|-------|-------|
| PE-P1-01 | HIGH | Journey 6 'Video Streaming Fundamentals' shows 18 steps (with every step title triplicated) while all other journeys show 6 grouped logical steps — list card and detail page both wrong, inconsistent with siblings | /journeys and /journey/6 |
| AC-P1-02 | MEDIUM | Taxonomy 'Create category' dialog closes and discards typed input when server-side validation fails (empty / duplicate name / duplicate slug) | /admin?tab=categories |
| AC-P1-03 | MEDIUM | Taxonomy 'Edit category' dialog closes and discards edits when validation fails (empty name) | /admin?tab=categories |
| AC-P1-04 | MEDIUM | 'Rejected' stat deep-link produces a non-round-tripping URL; the rejected filter is lost on reload | /admin -> click '177 rejected' -> /admin#resources |
| AC-P1-06 | MEDIUM | Resource edit dialog drops keyboard focus to <body> on close instead of returning it to the triggering row button | /admin?tab=resources |
| AO-ADM-01 | MEDIUM | JSON backup export reports tags:0 / empty tags[] despite ~1148 tagged resources (contradicts Enrichment tab 1,047 @ 57.7%) |  |
| AO-ADM-02 | MEDIUM | JSON backup schema doc mismatches actual data keys and leaks internal searchTsv column |  |
| AO-ADM-03 | MEDIUM | GitHub 'Last Import' card renders a green success checkmark on a FAILED / orphaned import |  |
| AO-ADM-04 | MEDIUM | GitHub 'Sync History' rows have no failure/status indicator; cross-surface inconsistency with 'Recent Sync Jobs' |  |
| AO-ADM-05 | MEDIUM | Enrichment job that COMPLETED with a skipped resource is badged 'failed' / '0% ok' |  |
| AO-ADM-06 | MEDIUM | Admin 'Export Markdown' button double-fires (2 POST + 2 downloads + 2 audit rows) on rapid double-click |  |
| PB-P-01 | MEDIUM | Search page SUBCATEGORY facet counts detach from their labels and overlap the result cards | /search?q=ffmpeg |
| PB-P-02 | MEDIUM | Invalid category/subcategory slugs show transient-looking 'Error Loading Resources / Please try again' with no navigation, instead of a proper 404 like resource pages | /category/<bad-slug>, /subcategory/<bad-slug> |
| PE-P1-02 | MEDIUM | Anonymous 'Refresh recommendations' button on /advanced fires an authenticated-only request and returns 401 (console error + network 4xx during a normal anon flow) | /advanced?tab=recommendations |
| PE-P1-03 | MEDIUM | Anonymous /advanced Recommendations copy claims the visitor is signed in ('Using your account activity', 'your feedback shape these picks') with no sign-in prompt | /advanced?tab=recommendations |
| AC-P1-01 | LOW | Resource count formatting is inconsistent within Admin (stats card & table footer omit the thousands separator; table header includes it) | /admin (Overview) and /admin?tab=resources |
| AC-P1-05 | LOW | Resources table footer uses plural 'resources' when exactly one result matches ('Showing 1 - 1 of 1 resources') | /admin?tab=resources |
| AC-P1-07 | LOW | Inconsistent validation-failure UX between admin dialogs: ResourceManager edit dialog stays open with an inline error, but taxonomy create/edit dialogs close and drop input | /admin?tab=resources vs /admin?tab=categories |
| AC-P1-08 | LOW | Resources table row action buttons (edit/delete) are below the 44px touch-target width on mobile | /admin?tab=resources |
| AO-ADM-08 | LOW | Audit-log Resource ID filter: out-of-range/invalid value yields misleading 'server error — try again' |  |
| PB-P-03 | LOW | Tag landing pages corrupt brand/acronym casing (FFmpeg -> FFMPEG, WebAssembly -> Webassembly) in both the visible H1 and the prerendered og:title | /tag/FFmpeg, /tag/WebAssembly |
| PB-P-04 | LOW | Multi-word tag pages produce awkward duplicated 'Video' in the title: 'Video Streaming Video Resources & Tools' | /tag/video%20streaming |
| PB-P-05 | LOW | Single-resource subcategory pages show incorrect plural: '1 resources available' and 'Showing 1-1 of 1 resources' | /subcategory/online-forums, /subcategory/software-codecs |
| PB-P-07 | LOW | Provider/Format/Skill-level filters are inert: every resource is 'Not yet classified', so each facet offers a single useless option and the resource prose repeats the filler 3x | /category/:slug (filters) and /resource/:id |
| PB-P-08 | LOW | Case-variant tag URLs both resolve to the same page (/tag/FFmpeg and /tag/ffmpeg render identical content), plus 301 lowercasing only fires for mixed-case via crawler path | /tag/FFmpeg vs /tag/ffmpeg |
| PE-P1-04 | LOW | Anonymous 'Choose learning preferences' link on Recommendations is a dead end — /settings#learning-preferences has no learning-preferences section for anon | /advanced?tab=recommendations -> /settings#learning-preferences |
| PE-P1-05 | LOW | Anonymous Recommendations empty state instructs the visitor to 'update your preferences' — an action unavailable to anonymous users | /advanced?tab=recommendations |
| PE-P1-07 | LOW | /code-of-conduct returns a 404 'Page Not Found' though it is enumerated as a public route in the surface map (route absent from router and sitemap) | /code-of-conduct |
| PE-P1-08 | LOW | Cross-surface login-link inconsistency: /submit uses '/sign-in?redirect_url=%2Fsubmit' while /journey/:id anon gate uses a bare setLocation('/login') (extra legacy redirect hop, no post-login return) | /submit vs /journey/6 |

## Bugs

### PE-P1-01 — Journey 6 'Video Streaming Fundamentals' shows 18 steps (with every step title triplicated) while all other journeys show 6 grouped logical steps — list card and detail page both wrong, inconsistent with siblings `HIGH`

- **URL**: /journeys and /journey/6
- **Viewports affected**: 1440x900
- **Reproduced**: 2/2
- **Note**: Also reported independently as public-engage P1-06 and admin-ops ADM-07 (merged).

**Steps to reproduce**

1. GET /api/journeys -> journey 6 stepCount=18; journeys 7/8/9/10 stepCount=6
2. GET /api/journeys/6 -> 18 step rows but only 6 distinct titles (each of 6 logical steps has 3 rows). The other journeys collapse their 3-rows-per-step into 6 logical steps; journey 6's rows carry distinct stepNumbers 1..18 so the group-aware UI never collapses them.
3. Open /journeys: the 'Video Streaming Fundamentals' card renders '18 steps'; every other card renders '6 steps'.
4. Open /journey/6: header badge reads '18 steps'; the Learning Path syllabus renders 18 step cards where each title ('Introduction to Video Streaming', 'Understanding Video Codecs', ...) appears 3 times in a row.
5. Contrast /journey/7: badge '6 steps', 6 syllabus cards, 6 distinct titles (correct).

**Expected**: Journey 6 should present 6 logical steps consistently on both the list card and detail page (like every other journey), grouping its 3-rows-per-step; a learner should not see the same step title listed three times.
**Actual**: Journey 6 reports and renders 18 steps with each of its 6 titles repeated 3x; the list card ('18 steps') and detail badge ('18 steps') both disagree with the group-aware convention used by journeys 7-10 ('6 steps'). '8-10 hours' duration paired with '18 steps' also reads inconsistently vs siblings.

**Evidence**
- `evidence/public-engage/journey6-syllabus.png`
- `evidence/public-engage/journey7-syllabus.png`
- `evidence/public-engage/journeys-stepcount-list.png`
- `evidence/public-engage/stepcount-parity.json`

**Resolution**: FIXED — data migration 0046 renumbers journey 6 steps into 6 logical steps (3 rows each), idempotent + journaled; applied to dev, ships to prod on publish. Progress rows unaffected (keyed by step id).

### AC-P1-02 — Taxonomy 'Create category' dialog closes and discards typed input when server-side validation fails (empty / duplicate name / duplicate slug) `MEDIUM`

- **URL**: /admin?tab=categories
- **Viewports affected**: 1440x900
- **Reproduced**: 2/2

**Steps to reproduce**

1. Open /admin?tab=categories
2. Click 'Add' (button-create-category)
3. Type name 'PersistTest' and slug 'encoding-codecs' (a slug already in use)
4. Click 'Create' (button-confirm-create)

**Expected**: A validation error is shown and the dialog stays open with the user's entered values so they can correct the offending field.
**Actual**: A destructive toast ('The slug "encoding-codecs" is already in use') flashes, but the create dialog closes immediately and all typed input is lost. Verified at t=100..2000ms the dialog and its inputs are gone. Same behavior for empty name/slug ('Name, Slug are required') and duplicate name ('A category named "Media Tools" already exists'). No category was actually created (count stayed 9).

**Evidence**
- `evidence/admin-core/categories-1440-dupslug-persist.png`
- `evidence/admin-core/categories-1440-dupslug.png`
- `evidence/admin-core/categories-1440-dupname.png`
- `evidence/admin-core/categories-1440-empty.png`

**Resolution**: FIXED — GenericCrudManager create dialog stays open with inline error banner; typed input preserved (root cause: client-validation toast forced a remount that wiped dialog state).

### AC-P1-03 — Taxonomy 'Edit category' dialog closes and discards edits when validation fails (empty name) `MEDIUM`

- **URL**: /admin?tab=categories
- **Viewports affected**: 1440x900
- **Reproduced**: 2/2

**Steps to reproduce**

1. Open /admin?tab=categories
2. Click the pencil/edit button on any category row (e.g. button-edit-1091)
3. Clear the Name field
4. Click Save/Confirm

**Expected**: Validation error shown and the edit dialog stays open so the user can restore the name.
**Actual**: The edit dialog closes immediately (afterEmptySubmit dialog absent), discarding the in-progress edit; only a transient toast is shown. Reproduced on two consecutive attempts. Category name unchanged in DB (no data mutated).

**Evidence**
- `evidence/admin-core/categories-1440-edit-emptyname-1.png`
- `evidence/admin-core/categories-1440-edit-emptyname-2.png`

**Resolution**: FIXED — same GenericCrudManager inline-banner fix covers the edit dialog (class fix across Category/Subcategory/Sub-subcategory managers).

### AC-P1-04 — 'Rejected' stat deep-link produces a non-round-tripping URL; the rejected filter is lost on reload `MEDIUM`

- **URL**: /admin -> click '177 rejected' -> /admin#resources
- **Viewports affected**: 1440x900
- **Reproduced**: 2/2

**Steps to reproduce**

1. Open /admin as admin
2. Click the '177 rejected' link (link-stat-rejected) on the Live Resources card
3. Observe Resources tab opens with status filter = Rejected, footer 'Showing 1 - 25 of 177 resources', URL becomes /admin#resources
4. Reload the page

**Expected**: The filtered state either persists on reload or the URL reflects it (e.g. /admin?tab=resources&status=rejected, which does work when typed directly).
**Actual**: After reload the Resources tab is active but the status filter resets to 'All Status' (footer jumps to 'Showing 1 - 25 of 1993 resources'). The deep-link sets ?status=rejected via replaceState but the subsequent onNavigate('resources') overwrites the URL to '#resources', dropping the param, so the filtered view cannot be reloaded, shared, or bookmarked. Reproduced twice.

**Evidence**
- `evidence/admin-core/resources-1440-rejected-reload.png`

**Resolution**: FIXED — ResourceManager seeds statusFilter from ?status= on init and mirrors it back into the URL; /admin?status=rejected#resources round-trips reload/share.

### AC-P1-06 — Resource edit dialog drops keyboard focus to <body> on close instead of returning it to the triggering row button `MEDIUM`

- **URL**: /admin?tab=resources
- **Viewports affected**: 1440x900
- **Reproduced**: 2/2

**Steps to reproduce**

1. Open /admin?tab=resources
2. Click a row's edit button (e.g. button-edit-188015) — focus correctly moves into the dialog title field
3. Close the dialog via Escape (also reproduced via the Cancel button)

**Expected**: On close, focus returns to the edit button that opened the dialog (standard modal focus restoration) so keyboard/AT users keep their place in the table.
**Actual**: activeElement after close is document.body (isTrigger:false, isBody:true) for both Escape and Cancel paths. The shared single Dialog is not tied to a per-row trigger and has no onCloseAutoFocus restoration, so focus is lost. Reproduced 3x (esc, cancel, esc).

**Evidence**
- `evidence/admin-core/resources-1440-editdialog.png`

**Resolution**: FIXED — editTriggerRef + onCloseAutoFocus returns focus to the triggering row button on Esc/Cancel.

### AO-ADM-01 — JSON backup export reports tags:0 / empty tags[] despite ~1148 tagged resources (contradicts Enrichment tab 1,047 @ 57.7%) `MEDIUM`

- **URL**: n/a
- **Viewports affected**: desktop
- **Reproduced**: 2/2

**Steps to reproduce**

1. GET /api/admin/export-json (X-Admin-Audit-Key) -> stats.tags:0, data.tags:[]; compare GET /api/admin/enrichment/coverage -> tagged:1047, coveragePct:57.7. Reproduced on two separate fetches (export.json, export-fresh.json).

**Expected**: 
**Actual**: 

**Evidence**
- `export.json`
- `export-fresh.json`
- `enrich-details.json`

**Resolution**: FIXED — JSON backup derives tags from resources[].metadata.tags (1,673 distinct tags, 1,148 tagged resources) instead of the empty tags table.

### AO-ADM-02 — JSON backup schema doc mismatches actual data keys and leaks internal searchTsv column `MEDIUM`

- **URL**: n/a
- **Viewports affected**: desktop
- **Reproduced**: 2/2

**Steps to reproduce**

1. GET /api/admin/export-json; diff schema.resources field list against Object.keys(data.resources[0]) -> 6 undocumented fields incl searchTsv; note schema.categories/subcategories/subSubcategories reference keys absent from data (real key is categoryHierarchy). Reproduced twice.

**Expected**: 
**Actual**: 

**Evidence**
- `export-fresh.json`
- `export.json`

**Resolution**: FIXED — schema doc rewritten to match actual keys (categoryHierarchy etc.); internal searchTsv stripped from every exported resource.

### AO-ADM-03 — GitHub 'Last Import' card renders a green success checkmark on a FAILED / orphaned import `MEDIUM`

- **URL**: n/a
- **Viewports affected**: desktop
- **Reproduced**: 2/2

**Steps to reproduce**

1. Open /admin#github; inspect 'Last Import' Alert icon class = 'lucide lucide-circle-check' while its own text reads 'Orphaned by server restart' / 0 Total. Confirmed via rendered DOM icon class and source. Visible at 1440 and 375.

**Expected**: 
**Actual**: 

**Evidence**
- `github-lastimport-1440.png`
- `github-syncstatus-crop-1440.png`
- `github-375-active.png`

**Resolution**: FIXED — sync-history now returns status; Last Import renders XCircle + destructive styling + "failed" badge for failed/orphaned imports.

### AO-ADM-04 — GitHub 'Sync History' rows have no failure/status indicator; cross-surface inconsistency with 'Recent Sync Jobs' `MEDIUM`

- **URL**: n/a
- **Viewports affected**: desktop
- **Reproduced**: 2/2

**Steps to reproduce**

1. Open /admin#github; Sync History lists ~20 orphaned rows with no status indicator; Recent Sync Jobs shows badge '31 failed'. Confirmed via DOM + API twice.

**Expected**: 
**Actual**: 

**Evidence**
- `github-375-active.png`
- `github2.json`
- `adm-final output (orphanRowCount:20)`

**Resolution**: FIXED — Sync History rows carry the same completed/failed badges as Recent Sync Jobs.

### AO-ADM-05 — Enrichment job that COMPLETED with a skipped resource is badged 'failed' / '0% ok' `MEDIUM`

- **URL**: n/a
- **Viewports affected**: desktop
- **Reproduced**: 2/2

**Steps to reproduce**

1. Open /admin#enrichment; job #21 row shows 'failed' + '0/1 ok (0%)'. GET /api/enrichment/jobs/21 -> completed, failed:0, skipped:1. Open View Details -> '0 Failed / 1 Skipped'. Reproduced twice.

**Expected**: 
**Actual**: 

**Evidence**
- `job21.json`
- `enrichment-job21-failed-badge-1440.png`
- `enrich-details.json`
- `enrichment-details-1440.png`

**Resolution**: FIXED — completed job with only skips shows "completed" + yellow "N skipped"; genuine failures still flag.

### AO-ADM-06 — Admin 'Export Markdown' button double-fires (2 POST + 2 downloads + 2 audit rows) on rapid double-click `MEDIUM`

- **URL**: n/a
- **Viewports affected**: desktop
- **Reproduced**: 2/2

**Steps to reproduce**

1. Open /admin#export; rapid double-click 'Export Markdown'. Observed posts:2, downloads:2. Reproduced in two independent trials (TRIAL1 & TRIAL2 both 2/2).

**Expected**: 
**Actual**: 

**Evidence**
- `dblclick.json`

**Resolution**: FIXED — synchronous exportingRef in-flight guard (same pattern as the public exporter).

### PB-P-01 — Search page SUBCATEGORY facet counts detach from their labels and overlap the result cards `MEDIUM`

- **URL**: /search?q=ffmpeg
- **Viewports affected**: 1440x900 desktop
- **Reproduced**: 2/2

**Steps to reproduce**

1. Go to /search?q=ffmpeg (any query that returns results)
2. Observe the left 'Narrow results' rail: CATEGORY facet counts are right-aligned correctly inside the rail
3. Scroll the SUBCATEGORY facet section: its count numbers (e.g. 79, 13, 5) render far to the right at x=692, outside the rail, floating on top of the result cards near 'ffmpeg-static'/'View Details'

**Expected**: Subcategory facet counts stay right-aligned within the facet rail, like the category facet counts
**Actual**: Subcategory facet count spans (button uses flex/justify-between/w-full but overflows the rail width) land at x~692 overlapping the middle result-card column; measured span.text '79' at x=692,y=649 and '13' at x=692,y=693, parent BUTTON class 'flex min-h-11 w-full items-center justify-between'

**Evidence**
- `evidence/public-browse/search-facet-zoom.png`
- `evidence/public-browse/search-facet-overlap-full.png`
- `evidence/public-browse/search-ffmpeg-desktop.png`

**Resolution**: FIXED — min-w-0 on facet fieldsets + shrink-0 on count spans; counts stay inside the 256px rail.

### PB-P-02 — Invalid category/subcategory slugs show transient-looking 'Error Loading Resources / Please try again' with no navigation, instead of a proper 404 like resource pages `MEDIUM`

- **URL**: /category/<bad-slug>, /subcategory/<bad-slug>
- **Viewports affected**: 1440x900 desktop
- **Reproduced**: 2/2

**Steps to reproduce**

1. Visit /category/does-not-exist-xyz (HTTP 404) — page body shows 'Error Loading Resources / Please try again.' with no Home/Browse button
2. Visit /subcategory/does-not-exist-xyz — same 'Error Loading Resources / Please try again.'
3. Compare with /resource/99999999 (also 404) which shows a polished 'Page Not Found' card with 'Browse all categories' and 'Go Home' buttons

**Expected**: A non-existent category/subcategory should present the same clear 'Page Not Found' state (with navigation) as a non-existent resource; a transient 'Please try again' message wrongly implies a network glitch the user should retry
**Actual**: category/subcategory 404s render 'Error Loading Resources / Please try again' (errLoad=true, pleaseRetry=true, pageNotFound=false, hasGoHome=false) with no recovery affordance; resource 404 renders 'Page Not Found' + Go Home/Browse buttons

**Evidence**
- `evidence/public-browse/notfound-bad-category.png`
- `evidence/public-browse/errstate-cat.png`
- `evidence/public-browse/errstate-sub.png`
- `evidence/public-browse/notfound-bad-resource-id.png`

**Resolution**: FIXED — TaxonomyListing renders the proper NotFound page (with navigation) on listing-API 404s; valid-parent+invalid-child notice path untouched.

### PE-P1-02 — Anonymous 'Refresh recommendations' button on /advanced fires an authenticated-only request and returns 401 (console error + network 4xx during a normal anon flow) `MEDIUM`

- **URL**: /advanced?tab=recommendations
- **Viewports affected**: 1440x900
- **Reproduced**: 2/2

**Steps to reproduce**

1. As an anonymous visitor open /advanced and activate the 'AI Recommendations' tab (aria-selected asserted).
2. The panel renders a 'Refresh recommendations' button (data-testid=button-generate-recommendations) that is enabled for anon.
3. Click it.
4. Network: GET /api/recommendations?limit=10&refresh=true -> 401 Unauthorized; browser console logs 'Failed to load resource: 401'.
5. Panel then flips to the error state: 'Recommendations couldn’t be refreshed — You need to be signed in to do that. Please sign in and try again.'

**Expected**: An anonymous user should not be shown an enabled control that fires an authenticated-only endpoint and 401s; the panel should gate behind sign-in (or hide/disable Refresh) rather than surfacing a 401 + console error on a normal click.
**Actual**: Anon click triggers a 401 on /api/recommendations and a console error, then shows a post-hoc 'You need to be signed in' error.

**Evidence**
- `evidence/public-engage/advanced-rec-anon-401-error.png`
- `evidence/public-engage/rec-refresh-loginlink.json`
- Console: `Failed to load resource: the server responded with a status of 401 (Unauthorized) (GET /api/recommendations?limit=10&refresh=true)`

**Resolution**: FIXED — anon refresh uses the anon-safe GET path; no 401, no console error.

### PE-P1-03 — Anonymous /advanced Recommendations copy claims the visitor is signed in ('Using your account activity', 'your feedback shape these picks') with no sign-in prompt `MEDIUM`

- **URL**: /advanced?tab=recommendations
- **Viewports affected**: 1440x900 and 375x667
- **Reproduced**: 2/2

**Steps to reproduce**

1. As anonymous, open /advanced, activate 'AI Recommendations'.
2. Header reads 'Personalized Recommendations — Account preferences, learning activity, and your feedback shape these picks.'
3. Card reads 'Using your account activity' / 'Add learning preferences for more precise matches. Existing activity and feedback still shape your results.'
4. No sign-in prompt appears anywhere in the panel (mentionsSignIn=false).
5. Same misleading copy reproduced at mobile 375x667.

**Expected**: For a visitor with no account, the copy must not assert 'your account activity', 'your feedback', or 'saved preferences shape your results'; it should honestly say results are non-personalized and prompt sign-in.
**Actual**: Anon sees possessive/account-implying copy as if signed in, with no account and no sign-in CTA in the panel.

**Evidence**
- `evidence/public-engage/advanced-desktop-rec-anon-full.png`
- `evidence/public-engage/advanced-mobile-rec-anon.png`
- `evidence/public-engage/rec-anon.json`

**Resolution**: FIXED — honest anon copy ("Popular Recommendations", "popularity-based ... not personalized") + "Sign in to personalize" CTA.

### AC-P1-01 — Resource count formatting is inconsistent within Admin (stats card & table footer omit the thousands separator; table header includes it) `LOW`

- **URL**: /admin (Overview) and /admin?tab=resources
- **Viewports affected**: 1440x900
- **Reproduced**: 2/2

**Steps to reproduce**

1. Open /admin as admin
2. Read the 'Live Resources' stat card -> renders '1816'
3. Click the Resources tab; read the header description -> 'Manage all 1,993 resources in the database'
4. Read the pagination footer -> 'Showing 1 - 25 of 1993 resources'

**Expected**: All resource counts use one consistent number format (thousands separators applied everywhere, e.g. 1,816 / 1,993).
**Actual**: AdminStats card ('1816', ResourceManager footer '1993') omit the comma while the ResourceManager header ('1,993') includes it — code: AdminStats.tsx line 146 and ResourceManager.tsx line 1044 use raw values, line 672/673 uses .toLocaleString().

**Evidence**
- `evidence/admin-core/resources-1440-header-footer.png`
- `evidence/admin-core/overview-1440-statscard.png`

**Resolution**: FIXED — toLocaleString() applied in AdminStats stat values/sublabels and ResourceManager footer.

### AC-P1-05 — Resources table footer uses plural 'resources' when exactly one result matches ('Showing 1 - 1 of 1 resources') `LOW`

- **URL**: /admin?tab=resources
- **Viewports affected**: 1440x900
- **Reproduced**: 2/2

**Steps to reproduce**

1. Open /admin?tab=resources
2. Search 'js_mse_eme' (a single-match query) and press Enter
3. Read the pagination footer

**Expected**: Singular noun for one result, e.g. 'Showing 1 - 1 of 1 resource'.
**Actual**: Footer reads 'Showing 1 - 1 of 1 resources' (wrong plural). ResourceManager.tsx line 1044 hardcodes 'resources' with no count-aware pluralization. Reproduced with two different single-match queries (js_mse_eme, srtdroid).

**Evidence**
- `evidence/admin-core/resources-1440-singular.png`

**Resolution**: FIXED — count-aware noun in table footer ("1 resource").

### AC-P1-07 — Inconsistent validation-failure UX between admin dialogs: ResourceManager edit dialog stays open with an inline error, but taxonomy create/edit dialogs close and drop input `LOW`

- **URL**: /admin?tab=resources vs /admin?tab=categories
- **Viewports affected**: 1440x900
- **Reproduced**: 2/2

**Steps to reproduce**

1. Open /admin?tab=resources, edit a resource, clear the Title, click Save -> inline error 'Title is required', dialog STAYS OPEN
2. Open /admin?tab=categories, add/edit a category, submit invalid -> toast error, dialog CLOSES and input is lost

**Expected**: Consistent validation-failure behavior across all admin dialogs (keep the dialog open and surface the error in-place).
**Actual**: ResourceManager edit dialog keeps the dialog open and shows a persistent inline field error; the GenericCrudManager taxonomy dialogs close on validation failure with only a transient toast, discarding the user's work. Two different, conflicting patterns for the same kind of interaction.

**Evidence**
- `evidence/admin-core/resources-1440-edit-validation.png`
- `evidence/admin-core/categories-1440-dupslug-persist.png`

**Resolution**: FIXED — resolved by the P1-02/03 refactor; all admin dialogs now share the stay-open inline-error pattern.

### AC-P1-08 — Resources table row action buttons (edit/delete) are below the 44px touch-target width on mobile `LOW`

- **URL**: /admin?tab=resources
- **Viewports affected**: 375x667 (isMobile, hasTouch)
- **Reproduced**: 2/2

**Steps to reproduce**

1. Open /admin?tab=resources on a 375x667 mobile viewport (isMobile:true, hasTouch:true)
2. Scroll the table horizontally to the Actions column
3. Measure the edit and delete icon buttons' bounding boxes

**Expected**: Interactive touch targets are at least 44x44 CSS px (WCAG 2.5.5 / mobile HIG).
**Actual**: Edit button is 42x44 and Delete button is 40x44 — both narrower than 44px, so the tappable width falls under the recommended minimum on touch. Measured identically on two runs.

**Evidence**
- `evidence/admin-core/resources-375-actions.png`
- `evidence/admin-core/resources-375.png`

**Resolution**: FIXED — min-h-11/min-w-11 on row action buttons; 44x44 verified at 375px.

### AO-ADM-08 — Audit-log Resource ID filter: out-of-range/invalid value yields misleading 'server error — try again' `LOW`

- **URL**: n/a
- **Viewports affected**: desktop
- **Reproduced**: 2/2

**Steps to reproduce**

1. Open /admin#audit; type 99999999999 (or 0) in Resource ID filter, click Search. Observe 400 + alert-audit-error 'The server returned an error ... try again'. Reproduced with 99999999999 twice and with 0 once.

**Expected**: 
**Actual**: 

**Evidence**
- `auditfilter.json`
- `audit-invalid-filter-1440.png`

**Resolution**: FIXED — client-side parseIntInRange validation; invalid Resource ID shows an honest inline error and never fires the request.

### PB-P-03 — Tag landing pages corrupt brand/acronym casing (FFmpeg -> FFMPEG, WebAssembly -> Webassembly) in both the visible H1 and the prerendered og:title `LOW`

- **URL**: /tag/FFmpeg, /tag/WebAssembly
- **Viewports affected**: 1440x900 desktop
- **Reproduced**: 2/2

**Steps to reproduce**

1. Visit /tag/FFmpeg -> H1 reads 'FFMPEG' (textTransform:none, so it is the real string), <title> 'FFMPEG Video Resources & Tools'
2. Visit /tag/WebAssembly -> H1 reads 'Webassembly', title 'Webassembly Video Resources & Tools'
3. curl -A Googlebot /tag/WebAssembly follows 301 to /tag/webassembly and its prerendered og:title is 'Webassembly Video Resources & Tools — Awesome Video'

**Expected**: Tag display should preserve the canonical tag casing: 'FFmpeg', 'WebAssembly'
**Actual**: Casing is normalized inconsistently (FFmpeg->all caps, WebAssembly->title case), losing correct brand capitalization; propagates into <title> and og:title seen by crawlers

**Evidence**
- `evidence/public-browse/tag-FFmpeg-desktop.png`

**Resolution**: FIXED — shared tagDisplayNameBranded() (curated brand-casing map in @shared/seo-templates) used by both client H1/title and server og:title (two-pass parity by construction).

### PB-P-04 — Multi-word tag pages produce awkward duplicated 'Video' in the title: 'Video Streaming Video Resources & Tools' `LOW`

- **URL**: /tag/video%20streaming
- **Viewports affected**: 1440x900 desktop
- **Reproduced**: 2/2

**Steps to reproduce**

1. Visit /tag/video streaming
2. Observe document.title = 'Video Streaming Video Resources & Tools — Awesome Video'

**Expected**: Title template should avoid word repetition when the tag already contains 'Video' (e.g. 'Video Streaming Resources & Tools')
**Actual**: The fixed 'X Video Resources & Tools' template concatenates blindly, yielding 'Video Streaming Video Resources & Tools'

**Evidence**
- `evidence/public-browse/tag-streaming-desktop.png`

**Resolution**: FIXED — shared tagTitleCoreDeduped() drops the duplicated "Video" ("Video Streaming Resources & Tools").

### PB-P-05 — Single-resource subcategory pages show incorrect plural: '1 resources available' and 'Showing 1-1 of 1 resources' `LOW`

- **URL**: /subcategory/online-forums, /subcategory/software-codecs
- **Viewports affected**: 1440x900 desktop
- **Reproduced**: 2/2

**Steps to reproduce**

1. Visit /subcategory/online-forums (contains exactly 1 resource)
2. Header reads '1 resources available'; result count reads 'Showing 1-1 of 1 resources'
3. Note the 'About this collection' prose on the same page correctly says 'includes 1 curated resource' (singular) — inconsistent within the page
4. Repeat on /subcategory/software-codecs (also 1 resource) — same '1 resources'

**Expected**: Singular noun for a count of 1: '1 resource available', 'Showing 1-1 of 1 resource'
**Actual**: Header and 'Showing' labels always use plural 'resources' regardless of count; only the About paragraph pluralizes correctly

**Evidence**
- `evidence/public-browse/subcat-online-forums.png`

**Resolution**: FIXED — resourceNoun(count) in TaxonomyListing + TagLanding headers/footers.

### PB-P-07 — Provider/Format/Skill-level filters are inert: every resource is 'Not yet classified', so each facet offers a single useless option and the resource prose repeats the filler 3x `LOW`

- **URL**: /category/:slug (filters) and /resource/:id
- **Viewports affected**: 1440x900 desktop
- **Reproduced**: 2/2

**Steps to reproduce**

1. Open any category page (e.g. /category/encoding-codecs): PROVIDER 'Not yet classified' 333, FORMAT 'Not yet classified' 333, SKILL LEVEL 'Not yet classified' 333 — the only option in each facet
2. Confirm globally: /api/awesome-list shows resourceFormat/provider/skillLevel = 'unknown' for all 1,461 tree resources; /api/resources/184792 also 'unknown' for all three
3. Open any resource detail (e.g. /resource/186391): Provider/Format/Skill level all 'Not yet classified' AND the auto-generated paragraph reads 'Provider: Not yet classified. Format: Not yet classified. Skill level: Not yet classified.'

**Expected**: Filters added for provider/format/skill should offer meaningful choices; if 100% of the catalog is unclassified, these facets should be hidden and the filler should not be surfaced 3x in human-readable prose
**Actual**: All three facets contain only 'Not yet classified' (equal to total), so filtering does nothing; the resource SEO/description paragraph repeats 'Not yet classified' three times on every resource

**Evidence**
- `evidence/public-browse/category-filters.png`
- `evidence/public-browse/resource-manytags-scrolled.png`
- `evidence/public-browse/category_encoding-codecs-desktop.png`

**Resolution**: FIXED — taxonomy pages collapse facet groups whose only option is "Not yet classified"; resource detail shows the note once and drops the filler sentence; server crawler renderer mirrored for hydration parity.

### PB-P-08 — Case-variant tag URLs both resolve to the same page (/tag/FFmpeg and /tag/ffmpeg render identical content), plus 301 lowercasing only fires for mixed-case via crawler path `LOW`

- **URL**: /tag/FFmpeg vs /tag/ffmpeg
- **Viewports affected**: 1440x900 desktop
- **Reproduced**: 2/2

**Steps to reproduce**

1. In-app SPA navigation to /tag/FFmpeg renders H1 'FFMPEG', 78 results
2. SPA navigation to /tag/ffmpeg renders the identical page (H1 'FFMPEG', 78 results) — two client URLs, same content
3. curl -A Googlebot /tag/WebAssembly returns 301 -> /tag/webassembly (server canonicalizes for crawlers), but the SPA itself keeps whichever mixed-case path the user landed on

**Expected**: One canonical tag URL; client should also normalize/redirect mixed-case tag paths to the canonical lowercase to avoid duplicate landing pages
**Actual**: Both /tag/FFmpeg and /tag/ffmpeg serve full identical pages client-side (duplicate landing surfaces); canonicalization only happens on the server 301 path

**Evidence**
- `evidence/public-browse/tag-FFmpeg-desktop.png`
- `evidence/public-browse/tag-ffmpeg-desktop.png`

**Resolution**: FIXED (verified existing) — <Redirect> via tagLandingPath canonicalizes /tag/FFmpeg -> /tag/ffmpeg client-side; percent-escapes preserved.

### PE-P1-04 — Anonymous 'Choose learning preferences' link on Recommendations is a dead end — /settings#learning-preferences has no learning-preferences section for anon `LOW`

- **URL**: /advanced?tab=recommendations -> /settings#learning-preferences
- **Viewports affected**: 1440x900
- **Reproduced**: 2/2

**Steps to reproduce**

1. As anonymous on /advanced Recommendations, note the 'Choose learning preferences' button links to /settings#learning-preferences.
2. Navigate to /settings#learning-preferences as anon.
3. The #learning-preferences section does NOT exist (sectionExists=false), page does not scroll (scrollY=0); anon Settings only shows 'Appearance' and a 'Sign in for more' card.

**Expected**: The recommendations CTA for anon should route to sign-in (or Settings should reveal/anchor the learning-preferences area behind a sign-in prompt), not to an anchor that is absent for the anonymous state.
**Actual**: Anon lands on /settings with no #learning-preferences target and no learning-preferences UI; the CTA leads nowhere useful.

**Evidence**
- `evidence/public-engage/settings-desktop-anon.png`
- `evidence/public-engage/settings-static.json`

**Resolution**: FIXED — anon CTA routes to /sign-in?redirect_url=<current path> instead of the dead settings anchor.

### PE-P1-05 — Anonymous Recommendations empty state instructs the visitor to 'update your preferences' — an action unavailable to anonymous users `LOW`

- **URL**: /advanced?tab=recommendations
- **Viewports affected**: 1440x900
- **Reproduced**: 2/2

**Steps to reproduce**

1. As anonymous, open /advanced Recommendations tab.
2. Because no recommendations are generated for anon, the empty state 'No unseen recommendations right now' renders.
3. Its guidance reads 'Restore hidden items, update your preferences, or try again to look for new catalog matches.'

**Expected**: The empty-state guidance for an anonymous user should not tell them to restore hidden items / update preferences (both require an account); it should prompt sign-in.
**Actual**: Anon is told to perform account-only actions (restore hidden items, update preferences) with no sign-in path.

**Evidence**
- `evidence/public-engage/advanced-desktop-rec-anon-full.png`
- `evidence/public-engage/rec-anon.json`

**Resolution**: FIXED — anon empty state no longer references account-only actions; prompts sign-in instead.

### PE-P1-07 — /code-of-conduct returns a 404 'Page Not Found' though it is enumerated as a public route in the surface map (route absent from router and sitemap) `LOW`

- **URL**: /code-of-conduct
- **Viewports affected**: 1440x900
- **Reproduced**: 2/2

**Steps to reproduce**

1. Navigate to /code-of-conduct in the SPA.
2. Page renders 'Page Not Found' (title 'Page Not Found — Awesome Video') and the network shows a 404 for the route.
3. Reproduced twice via curl: HTTP 404 both times. Not present in the client router or sitemap.xml.

**Expected**: Either the /code-of-conduct page exists (it is listed as a public route) or it is not advertised as a public surface. A documented public route should not 404.
**Actual**: The documented public route /code-of-conduct 404s. (Note: no rendered UI link points to it — footer links only About/Terms/Privacy — so user impact is limited to typed/bookmarked/documented URLs.)

**Evidence**
- `evidence/public-engage/anon-sweep.json`
- Console: `Failed to load resource: the server responded with a status of 404 (Not Found) (/code-of-conduct)`

**Resolution**: FIXED — /code-of-conduct implemented as a real static page (Terms/Privacy pattern): route, SEOHead, og-middleware parity, sitemap entry, footer link.

### PE-P1-08 — Cross-surface login-link inconsistency: /submit uses '/sign-in?redirect_url=%2Fsubmit' while /journey/:id anon gate uses a bare setLocation('/login') (extra legacy redirect hop, no post-login return) `LOW`

- **URL**: /submit vs /journey/6
- **Viewports affected**: 1440x900
- **Reproduced**: 2/2

**Steps to reproduce**

1. On /submit as anon, the 'Login required' banner links to /sign-in?redirect_url=%2Fsubmit (deep link with return URL).
2. On /journey/6 as anon, the 'log in' button calls setLocation('/login'), which is a LegacyAuthRedirect to /sign-in with NO redirect_url — after sign-in the user is not returned to the journey.
3. Clicked the journey 'log in' button: navigation lands on /sign-in (no redirect_url query).

**Expected**: Both anon gates should route to the same auth surface with a redirect_url back to the originating page, so a user returns to the journey/submit form after signing in.
**Actual**: The journey gate loses the return path (goes to /login -> /sign-in with no redirect_url), while /submit preserves it — an inconsistent, lossy login hand-off across two engagement surfaces.

**Evidence**
- `evidence/public-engage/rec-refresh-loginlink.json`
- `evidence/public-engage/journey6-desktop-anon.png`

**Resolution**: FIXED — journey anon gate uses /sign-in?redirect_url=<encoded path> with the safe-path guard; return path preserved.

## Refuted / merged candidates

- **PB-P-06** (REFUTED): claimed /api/awesome-list tree holds only 1,461 of 1,816 resources. Lead recount of unique resource ids across all nesting levels (category / subcategory / sub-subcategory / top-level) found **1,816/1,816 present, 0 missing** — the hunter's counter missed a nesting level.
- **PE-P1-06 + AO-ADM-07** (MERGED into PE-P1-01): the same journey-6 step-triplication root cause, observed from three surfaces.

## Observations (not bugs)

- "Total Users" drifts (6→11→6) from anonymous Clerk placeholder auto-provisioning — pre-existing, tracked as project task #214.
- Sync Status "31 of 38 recent sync jobs failed" reflects real orphaned dev-restart jobs (accurate reporting, not a defect).
- Clerk "Development mode" banner on /sign-in is platform-injected (dev instances only).

## Coverage gaps

- Signed-in *browser* flows in the engage partition were verified at API + code level (Clerk backend-minted Bearer sessions) rather than pixel level; anon browser coverage is complete.
- Researcher tab and GitHub sync triggers were audited read-only (no mutation of external systems).

## Verification (post-fix)

- Typecheck: clean. Production build: clean.
- Gates re-run green: url-params-audit 31/31, taxonomy-listing-parity, responsive-audit 32/32, tablet-audit 21/21, print-audit 49/49, migration-drift (23 migrations incl. new 0046), seo-snapshot GATE + parity (0 structural failures, schema 100%, hydration parity 20/20 after mirroring the P-07 collapse into the server crawler renderer).
- Post-restart probes: /code-of-conduct crawl+hydration parity, admin ops API shapes, anon recommendations flow, journey-6 grouping + login redirect — all green.
- QA data teardown: net-zero (__qa_test_* users/rows swept; 0 remaining).
