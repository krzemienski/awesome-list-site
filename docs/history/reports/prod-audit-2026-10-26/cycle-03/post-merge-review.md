# Post-merge review of #66–#75 (sonnet, on origin/main cd52d0cf) — no REVERT
1. LOW ResearchLaunchGuide.tsx:104,193 — launchAttempted never resets (after successful launch or brief-mode change) → "Brief too short" role=alert appears immediately and re-announces per keystroke. Fix: reset in start onSuccess and on brief-mode change.
2. MEDIUM TagLanding.tsx:~251 — #73 added showPersonalActions={false} to tag-page cards: signed-in users lost favorite/bookmark/suggest-edit on /tag/:slug. Restore actions (they were unintentionally dropped).
3. MEDIUM index.css:~134, layout.css:44, footer.css:10/173 — --shell-gutter-end = max(--page-pad-x, 3.75rem) reserves 60px on the right of EVERY page at every width (375px phones lose 20px; footer too). Fix: reserve the lane only where content can collide with the button (e.g. ≥ widths where the button floats over the content column), or lift the button out of the content area at narrow widths — keep the invariant that nothing is ever under the button.
4. LOW alert.tsx default live="assertive": static informational alerts still assertive — BatchEnrichmentPanel.tsx:739 ("A job is currently running"), :883 ("No enrichment jobs found", fires on every render), LinkHealthDashboard.tsx:556, :759, Contributions.tsx:370, :800. Fix: live="off"/"polite" there (consider default "off" with errors opting in).
5. LOW sidebar-tree.css (#71) .av-sidebar-l3-row::before inset 9.5px with negative margin-block rows — possible offset highlight; verify in browser.
6. LOW useResourceToggle.ts:~336-345 (#75) — removedRef from ["/api/bookmarks"] cache; if not loaded, Undo says "Bookmark restored" but loses note/collections. Seed snapshot from card's known notes or don't claim full restore.
7. LOW ResourceManager.tsx:~379-390 (#68) — pendingResultsFocusRef stays true if the page request fails/cancels; a later refetch steals focus. Clear on error/unmount.
8. LOW analytics (#73): tag-page cards now report surface=taxonomy_card (documented value). Add a cutover note to docs/ANALYTICS.md.
9. LOW syncService.ts:910 (#70) — stored warnings count no longer comparable (lint findings moved out); store validationErrors.length too or note it.
10-11 NIT: nav-history fragment tabindex leftover; ResourceManager comment overclaims Back restoring table (replaceState).
12. LOW LinkHealthDashboard.tsx:~254 (#67) — Total = checkedLinks but problem counters from live table → Total ≠ healthy+problems after deletions; make the summary explain or reconcile.
13. NIT (#75) action toasts now persist bottom-right, same corner as back-to-top — confirm no overlap.
14. UNVERIFIED (#72) PaletteFooter placement inside <Command>, grid-template-rows single row.
