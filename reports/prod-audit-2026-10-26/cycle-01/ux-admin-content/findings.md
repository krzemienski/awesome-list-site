# Findings — ux-admin-content (cycle-01)

- Slice: admin Overview, Approvals, Edits, Resources, Categories, Subcategories (+ Sub-subcats via Settings menu, 1440 only)
- Revision: 229f004d6cf10eea93a69bf3120d3f66fda7de99 at start (09:23:54Z) and end (09:52:28Z)
- Browser: agent-browser session `ux-admin-content`, owner cookie imported (role admin), consent declined, `umami.disabled=1`
- Widths: 1440×900; 820×1180 ("iPad Air"); 390×844 ("iPhone 14"). Note: agent-browser device emulation sets size/UA/DPR but `matchMedia('(pointer:coarse)')` stayed false, so hover-only CSS was judged from the stylesheet, not from a coarse pointer.
- Verdict: **ISSUES** (5 findings: 2 MEDIUM, 3 LOW)

| id | sev | tab | width | saw | expected | evidence | likely source |
|---|---|---|---|---|---|---|---|
| AC-01 | MEDIUM | Resources (Add / Edit dialog) | all | Invalid submit shows inline errors but focus stays on the submit button, and the error `<p>`s have no `role=alert`/`aria-live`, so a screen-reader user gets no signal. (Categories/Subcategories forms do use `role=alert`.) | Move focus to the first invalid field, or announce the errors | resources-create-validation-1440.png; eval: `focus=button-create-resource`, `error-create-url role=null live=null parentLive=false` | client/src/components/admin/ResourceManager.tsx:998 (`handleCreate` → `validateEditForm`), :2065 (error `<p>`) |
| AC-02 | MEDIUM | Resources | 820, 390 | Row-select checkboxes and the select-all checkbox are `opacity:0` at rest and appear only on `:hover`/`:focus-within` of the ID cell. With no coarse-pointer override, touch users see no selection control, so bulk actions can't be discovered unless "Show filters and tools" is opened. | Visible at rest on touch (target-size rule: hover-only on touch = FAIL) | resources-390.png, resources-820-checkbox-hidden.png; eval at 820: `rowCbOpacity:"0", selAll:"0"` | client/src/styles/pages/admin-catalog-resources.css:284 (`opacity:0`), :315-316 (hover/focus-within reveal), :354 (tools-open override only) |
| AC-03 | LOW | Resources, Categories, Subcategories | 390 (Resources also 820) | Edit/Delete row actions sit off-canvas inside a horizontal scroller (Categories/Subcategories: client 308 / scroll 672, Edit at x=605; Resources 390: 308/1012, Edit at x=945; Resources 820: Edit right edge 989 > 820). There is no swipe hint, and the scroller isn't focusable (`tabIndex -1`). Approvals and Edits both have a hint plus a focusable "…table, scrollable" region. | Same affordance as Approvals (swipe hint + labelled focusable scroller), or reflow actions into view | categories-390.png, subcategories-390.png, resources-390.png; approvals-820.png for the good pattern | GenericCrudManager.tsx (table wrapper); ResourceManager.tsx (table wrapper); compare PendingResources.tsx `hint-swipe-pending-table` |
| AC-04 | LOW | Edits | all | Heading/subtitle read "Edit history · Pending and recent edits to resources", but the list shows only pending edits. After I approved #67 and rejected #68, both disappeared and the panel read "No pending edits.", with no history shown. | Copy matches content ("Pending edits"), or recent resolved edits are actually listed | edits-1440.png, edits-empty-1440.png | client/src/components/admin/PendingEdits.tsx:329-330, :353-354, :408; server/routes/domains/admin-content.ts:1156 (`getPendingResourceEdits` only) |
| AC-05 | LOW | Categories / Subcategories | 820, 390 | A disabled Delete explains why ("Cannot delete: 129 resources still assigned…") only through a `title` attribute on a wrapper span. Touch shows no tooltip, so the reason never appears visually (it does reach screen readers via the button's aria-label). | Visible reason on touch (inline text or tap-to-explain) | categories-disabled-delete-hover-1440.png; eval: wrapper `<span … title="Cannot delete: 129 resources still assigned…">` | GenericCrudManager.tsx (`admin-taxonomy-delete-action` span) |

## Passed (driven, with evidence)
- **Overview:** the 4 stat cards match the API (`totalPublic` 3825 / 9 categories; 99 subcategories; 20 active users, 1 admin, recomputed from `/api/admin/users` pages 1–2 with a 30-day `updatedAt` window; 15 pending, oldest 61d). Top-5 categories match `/api/categories` (sum of all 9 = 3825). Activity shows the latest 6 audit-log ids 27365…27360. Keyboard Tab order is logical with a 2px accent outline. Enter/Space on each stat card opens its tab and focuses that tab trigger, and Back returns to Overview. No overflow and no undersized targets at 820/390 (overview-*.png).
- **Approvals:**
  - Review dialog: focus in, Escape, focus returns.
  - Approve-all dialog shows the real count ("Approve 15"); I cancelled it and focus returned.
  - Reject dialog: Confirm stays disabled under 10 characters, with a live counter.
  - Single approve (190345): toast shown, row removed, counter 19→18, public API `status=approved`.
  - Single reject (190347): toast quotes the reason; counter 18→17.
  - Bulk-selecting my own rows 190346 + 190348 shows "Bulk reject (2)" / "Approve selected (2)", select-all goes to `mixed`, the bulk-reject outcome banner reads "2 succeeded · 0 failed", and the counter returns to 15.
  - Checkboxes are 16×16 but meet the 24px spacing exception (nearest target 91–113px).
- **Edits:** Suggest Edit from /resource/190345 created edits #67/#68 and stats `pendingEdits` went 0→2. The Diff dialog shows the −/+ description and the local time is correct (browser TZ America/New_York). Escape returns focus. Reject Confirm stays disabled until 10 characters. Reject #68 and approve #67 both toast. The approved description is live in the public API, and stats `pendingEdits` = 0.
- **Resources:**
  - Header search and the tools-panel search stay in sync.
  - Status filter (All/Approved/Pending/Rejected/Withdrawn) and sort (Newest/Oldest/A–Z/Z–A) reorder and filter correctly and sync `?status=`. The category filter works. The empty state has a working "Clear filters".
  - Pagination (Go to page 2, Next) works and `?page=` survives a reload. It's tested in a 1440×3000 viewport because headless agent-browser doesn't scroll. Back skipping pages is the intended replaceState behaviour (ResourceManager.tsx:247).
  - Create validation (required fields, URL with spaces, http/https scheme).
  - Edit validation (blank title → "Title is required"), then save; rename persisted.
  - Featured toggle 8→9→8, matching `/api/admin/resources?featured=true`.
  - Bulk bar: 3 own rows selected → the dialog lists the titles → 3 deleted, each GET returns 404.
  - Single delete: Escape returns focus; confirm → 404.
  - Stats returned exactly to baseline (4016 / 3825 / 15 / 0 / 147).
- **Categories:**
  - Counts match the API (resourceCount, and subcategories per categoryId).
  - Empty submit → `role=alert` "Name, Slug are required"; slug auto-fills from the name; a bad slug is rejected; a duplicate slug shows inline "already in use".
  - Create 1194; with a child present, Delete is disabled with a reason in aria-label; edit-dialog Escape returns focus; delete → gone.
- **Subcategories:** search shows "1 of 1 (filtered from 100)". Create 2333 under the parent 1194; the edit validation catches a blank name; rename persisted; delete cancel returns focus; confirm delete → API 99. Pagination numbers are 32×32 at 1440 (≥24) and pass at touch widths.
- **Sub-subcats** (Settings menu, `#subsubcategories`): renders with the Subcategories tab highlighted; 10 rows per page × 4 pages is consistent with the API total of 32; no undersized targets at 1440.
- **Console:** 0 errors/warnings; `agent-browser errors` is empty.
- **Horizontal page scroll:** none on any tab at any width (`scrollWidth == innerWidth`).

## UNVERIFIED
- True coarse-pointer behaviour: emulation reported `pointer:fine`, so AC-02 and AC-05 are judged from CSS.
- Loading and error states (AdminLoadError / Retry banners): no failure could be forced without stubs.
- Executing bulk approve, and the Resources bulk Approve/Reject buttons: only the dialogs were opened. Bulk reject was executed in Approvals on my own rows.
- Resources create-dialog Kind/Format/Provider/Skill-level selects, the sub-subcategory select, and the "Go to page" number input.
- Full keyboard-only pass on Approvals/Resources/taxonomy tables: only dialog focus-in/return and the Overview tab order were checked.
- Numeric contrast measurements (only a visual check: no low-contrast text seen in the screenshots).
- Sub-subcats at 820/390, and its create/edit/delete (no row created there).
- GenericCrud undo/redo, audit trail and export controls: not rendered on these tabs.

## Out of slice (noted, not counted)
- Header nav links (Browse/Submit/About/Docs/Admin) are 21px tall at 1440 (below 24, no spacing check done): header owner.
