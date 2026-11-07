# Takeover triage (lead decisions; each checked against origin/main bc1797b0 source or evidence)

| id | lead verdict | reason |
|---|---|---|
| T6-07-01 field error lacks role=alert | NOT A DEFECT | Focus moves to the invalid field, which carries aria-invalid + aria-describedby to the message (screenshot cat-create-empty-1440.png viewed); server errors use the dialog role=alert banner (GenericCrudManager.tsx:3101-3108). Screen readers announce the error on focus. |
| T6-07-02 slug override lost when Name is edited | DEFECT LOW -> FIX-A | CAT-10 requires a manual slug to override auto-output; handleNameChange always overwrites slug (GenericCrudManager.tsx:2599-2604). |
| T6-08-01 Avg cost averages no-op batches | DEFECT LOW -> FIX-B | 7 of 9 costed jobs are $0 runs; 4 processed 0 resources. averageBatchCost (BatchEnrichmentPanel.tsx:96-107) should only count batches that processed resources, like costPerResource beside it. |
| T6-08-02 launch-limit validation | DEFECT LOW -> FIX-C (scoped) | The lane could not click Launch (run #84 active), so the role=alert message was not observable. Real part: limitsSummary echoes "-5 min minimum"/"9999 min minimum" as accepted (ResearchLaunchGuide.tsx:225-230), and invalid limit fields never get aria-invalid/describedby. |
| T6-08-03 Last enriched shows cancelled batch | NOT A DEFECT | Intended: a cancelled run still wrote resources (code comment BatchEnrichmentPanel.tsx:430-434); the sub-label says "cancelled". |
| T6-08-04 empty tabpanel text while aborted | NOT A DEFECT | The lane's own probe artifact; the error UI rendered (en-1440-jobs-fail.png). |
| T6-09-01 Export history error/Retry not shown | UNPROVEN -> re-drive | Partial route abort; re-drive with a full abort of the history endpoint in a follow-up lane. |
| T6-09-02 users clear button 36px at 1440 | NOT A DEFECT | Fine pointer at 1440; >=24px passes. 44px only on touch widths, where it measured 44. |
| T6-09-03 no real coarse pointer | BLOCKED (tool) | Headless browser has pointer:fine; real touch is BLOCKED unless exercised on a device. |
| T6-04-01 empty collection name saved | TOOL ARTIFACT (re-drive) | Save is `disabled={!collectionName.trim() …}` (Bookmarks.tsx:1187); the lane's PATCH carried the OLD name, so React state was never cleared (fill "" does not fire onChange). Follow-up lane re-drives with real keyboard deletion. |
| T6-04-03 /settings/notifications 404 | NOT A DEFECT | No link to that route anywhere in client/src or server (git grep origin/main). |
| T6-01-01 parent link not marked ancestor | NOT A DEFECT | PC-011 asks for aria-current on the current leaf only; it is present. |
| T6-01-02 compact rail last link at 600px height | RE-DRIVE | The rail scrolls; the keyboard walk to the last link was not finished. A follow-up lane must Tab to "Source" and read its rect. |
| T6-01-03 header "Docs ↗" opens /design-system | DEFECT LOW -> FIX-D (same PR) | AppHeader.tsx:112 hard-codes /design-system (the component showcase) while the sidebar Docs ↗ uses repoUrl/tree/<branch>/docs (AppSidebar.tsx:1136-1143). Same label, two destinations. |
| T6-09-01 Export history error/Retry | WITHDRAWN (tool) | L09a fully aborted audit-logs: "Couldn't load export history" + 44px Retry at 1440/820/390 (ex20-390-error.png viewed). The earlier glob did not match. |
| T6-02-01 Clear all keeps unsupported sort | DEFECT LOW -> FIX-H | Search.tsx:151-185 clearFilters keeps state.sort unless includeSort; both onClear callers (299, 301) pass nothing. |
| T6-02-02 Clear invalid filters wipes a valid query | DEFECT LOW -> FIX-H | clearInvalidRequest (Search.tsx:187-197) resets to /search; PS-006 says do not wipe the query unintentionally. |
| T6-02-03 journey "log in" 36x21 | NOT A DEFECT | Inline link in a sentence (JourneyDetail.tsx:585-592, "Please log in to start…"), which the target-size rule exempts. |
| T6-02-04 settings radios 16px | NOT A DEFECT | Wrapped in a ~332x80 label, which is the target. |
| T6-02-05 export checkboxes 24px / cookie button 24px | NOT A DEFECT | Checkboxes have 44px label/::after hit areas. "Open cookie settings" is inline in running text (LegalPolicyPage.tsx:35-40). |
| T6-05a-01 Overview categories fetched under 2 query keys | DEFECT LOW -> FIX-J | AdminStats.tsx:137 vs AdminOverview.tsx:354; one Retry does not clear the other's error (ov13-inconsistent-1440.png). |
| T6-05a-02 Top categories lists zero-count rows | DEFECT LOW -> FIX-K | No count>0 filter at AdminOverview.tsx:387-392. |
| T6-05a-03 Researcher API "Healthy" on a red dot | DEFECT MEDIUM -> FIX-I | ai.isError branch prints stale ai.data.status (AdminOverview.tsx:258-268); seen in ov11-stale-1440.png. |
| T6-05a-04 Enrichment "no runs" is green | DEFECT LOW -> FIX-L | Inconsistent with GitHub/Link checker no-run "unknown"; the inventory says no fake healthy state. |
| T6-01a-01 sidebar rows clickable over 9px only | DEFECT MEDIUM -> FIX-M (fix/t6-sidebar-hit-areas) | Negative block margins (sidebar-tree.css:274-280) make the next 44px row cover the previous one; elementFromPoint band 708-716 at 1440 (pc-1440-all-in-codecs-hit.txt read by the lead). |
| T6-01a-02 drawer vs header Docs | DUPLICATE of T6-01-03 (FIX-D) | |
| T6-01-02 rail last link | WITHDRAWN | Tab 11 reaches Source inside the 600px viewport (pc012-1100x600-tab-walk.txt). |
| T6-07a-01 slug override lost (real keys) | CONFIRMS FIX-A | Same as T6-07-02. |
| T6-07a-02 no-match text clipped at 390 | DEFECT LOW -> FIX-N (fix/t6-admin-lows) | Centred colSpan cell in a 672px table inside a 302px scroller (cat03-nomatch-390.png viewed: "No categor"). |
| T6-07-01 field error lacks role=alert | KEEP: NOT A DEFECT | Same reasoning as before: focus plus aria-describedby announce it. |
| T6-03-01 card focus without ring | TOOL ARTIFACT | The probe read `outline` only. AX-007-focus-viewdetails-1440.png (viewed) shows a red ring on the focused View-details button, so the ring is drawn another way. Re-check tag pills by screenshot in L03b. |
| T6-03-02/03/04 16px/32px checkboxes, 16px radios | NOT A DEFECT (re-measure) | The rect-only probe misses hit areas. The Checkbox primitive centres a 44px hit area below 1024px, and queues-review.css:171-179 widens it from 1024px; radios sit in full-row labels. L03b re-measures with elementFromPoint. |
| T6-03-05 52 bare "Approve" names | TOOL ARTIFACT | ResearcherTab.tsx:1071/1076 and ResearchRunDiscoveries.tsx:72 set aria-label "Approve discovery: <title>"; the probe read text content. |
| T6-03-06 table links 21-28px | RE-MEASURE | Needs the spacing-exception check (L03b). |
| T6-03-07 home "+N more" 19px | NOT A DEFECT | Spacing exception holds: 9.5 + 15.6 = 25.1px to the nearest target, which is more than 12. |
| T6-03-08 inline links | NOT A DEFECT | Inline in running text, so exempt. |
| T6-03-09 Admin inside sidebar More | NOT A DEFECT | Design: Admin is in the header, the account menu and sidebar More; SH-02 passes. |
| T6-03-10 reduced motion | UNPROVEN | The lane itself saw no animation under reduce. |
| T6-03-11 single footer has no label | NOT A DEFECT | One contentinfo landmark needs no label. |
| T6-03-12 #related-topics-heading on resource page | RE-CHECK | Find which page the AX-003 row means and whether resource pages link to that id (L03b). |
| T6-03-13 Back lands on BODY (/tag, 390) | RE-DRIVE (L03b) | Possible PG-11 regression; needs a second method. |
| T6-03-14 384 vs 390 width | TOOL ARTIFACT | Emulated scrollbar width, not a page gutter. |
| C6-AX-006 FAIL "no dialog/trap" | WRONG SURFACE | Screenshot AX-006-filter-sheet-390.png shows the category page's inline filter panel, not a dialog. The /search Filters sheet is a Radix SheetContent with aria-pressed facets and aria-live count (SearchFilters.tsx:91,142,154). Re-drive on /search (L03b). |
| T6-06-01 failed page change drops stale rows, claims 0 of 0 | DEFECT MED -> FIX-O (fix/t6-admin-resources) | rm02-1440-error-newkey-rowsdropped.png viewed. |
| T6-06-02 offline first load says "No resources yet." | DEFECT MED -> FIX-P | ResourceManager.tsx:1590 paused-query branch. |
| T6-06-03 820 filter row overflows/clips | DEFECT MED -> FIX-Q | rm09-820-filterrow-crop.png viewed: search 56px wide, "All…", "Newe…". |
| T6-06-04 no-match does not name filters | DEFECT LOW -> FIX-S | |
| T6-06-05 no-match clipped at 390 | DEFECT MED -> FIX-R | Same pattern as FIX-N. |
| T6-06-06 Featured chip 41px on touch | DEFECT LOW -> FIX-T | chip-button.tsx:19 has no min height. |
| T6-06-07 no status column, getStatusBadge unused | DEFECT MED -> FIX-U | ResourceManager.tsx:1104 defined and never called (grep). |
| T6-06-08 tags cut to 2 with no +N | DEFECT LOW -> FIX-V | ResourceManager.tsx:1619 slice(0, 2). |
