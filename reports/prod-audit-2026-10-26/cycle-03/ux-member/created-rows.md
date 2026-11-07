# ux-member cycle-3 writes (owner account, rev b89d3e4b). Baseline re-recorded 00:30:58Z (old 401-only baseline deleted); end snapshot in end/.
- 00:33:11Z UI Pause for 7 days -> PATCH /api/notification-preferences {"pausedUntil":"2026-11-03T00:33:11.195Z"}; 00:33:18Z Resume now -> {"pausedUntil":null}; timezone stayed America/New_York. Side effect: updatedAt 2026-10-26T17:06:31Z -> 2026-10-27T00:33:18Z (not restorable).
- Collection 148 "[QA-audit-1026] collection" created, renamed "... renamed", deleted via UI (GET /api/collections -> []).
- Bookmark 190125 added with note "QA-audit-1026 note" + collection 148 (collectionIds [148]); after collection delete collectionIds [], note kept; removed from /bookmarks (12 bookmarks). Re-added without note and removed again for toast timing (Undo toast gone at ~6.7s). Final 12 = baseline.
- Favorite 190125 on then off -> [185551,186357] = baseline.
- Journey 9 step 1 Mark as Complete -> completedSteps [217,218,219]; Undo -> [] (= baseline). lastAccessedAt bumped (not restorable).
- Recommendation feedback Helpful on 189969 -> on, then off -> [] (= baseline).
- Resource 190354 "[QA-audit-1026] member submission" (https://github.com/krzemienski/awesome-list-site/issues/42) submitted at ~00:40Z, withdrawn via UI (alertdialog, focus on Keep pending), DELETE /api/admin/resources/190354 after title-prefix check -> 200; owner and anon GET -> 404.
- Not mine: pending row 190353 "[QA-audit-1026] c3 resource" was in my baseline and absent at end; untouched by me.
- End vs baseline: all 10 endpoints SAME except volatile fields and the other slice's 190353. preferences revision 41 unchanged.
