# ux-member — cycle 02 (rev c25cd76f, 16:56:59Z–17:30:14Z) — ISSUES 1 MEDIUM; MB-01..03 FIXED
(saved by lead from the auditor's final message; harness refused the auditor's Write)

| id | sev | URL | width | saw | expected | evidence | likely source |
|---|---|---|---|---|---|---|---|
| MB-04 | Medium | /bookmarks card "Remove bookmark" | 390 touch (all widths) | "Bookmark removed" + Undo toast auto-dismisses after 6.0 s; focus moves to next card; removal drops the bookmark's note, unrecoverable once toast gone. Same removal on /resource/:id: "Removed from bookmarks" + Undo still open after 10 s. | toast with an action persists until dismissed (Toaster rule BUG-052 / WCAG 2.2.1); one copy for one action | created-rows.md toast checks 17:19–17:24Z | BookmarkButton.tsx:131 `duration: 6000` overrides toaster.tsx:22; sibling useResourceToggle.ts:131 (guest, not driven); copy BookmarkButton.tsx:130 vs ResourceDetail.tsx:295 |

## Cycle-1 re-checks
MB-01 FIXED (owner-password explanation, no dead button, 1440/820/390). MB-02 FIXED (Pause PATCH {"pausedUntil":...}, Resume {"pausedUntil":null}; timezone unchanged). MB-03 FIXED ("Continue Journey" for enrolled 0%).

## Passed: baseline/restore of 10 endpoints identical (volatile fields only moved); profile tabs/dialogs; settings; bookmarks/collections lifecycle at touch; favorites; journey complete/undo; recommendations feedback; notifications; submit→withdraw→delete 190352 → 404; no overflow or target failures on 10 member pages at 3 widths; no console errors.
## UNVERIFIED: collection publish/archive, bulk actions, queue status, API keys, Unsubscribe all, Reset preferences, deletion request, theme writes; reduced motion and full keyboard walk; MB-01 for a Clerk member; MB-04 guest sibling.
## Rows: collection 147 deleted; resource 190352 deleted (lead re-checked 404); prefs revision 39→41, notif updatedAt, journey 9 lastAccessedAt moved (unrevertable).
