# ux-member created / changed rows (owner account, live awesome.video rev 229f004d)

## INCIDENT (auditor error, restored)
- ~10:01Z: while testing blank-name validation in the Edit display name dialog, select-all keystrokes did not clear the fields (values became "Admi"/"Use") and I clicked Save → PATCH /api/user/profile renamed the owner to "Admi Use".
- Restored at 10:01:52Z through the same dialog to first "Admin", last "User"; GET /api/auth/user → name "Admin User" (matches baseline).
- Cause: I did not verify the field values were empty before clicking Save. After this, every write waits for a value read-back first.
- Network log for the dialog session showed 4× PATCH /api/user/profile 200: two were no-op saves of the unchanged "Admin User" (agent-browser `fill ""` changed the DOM value but not React state), one was "Admi Use", one was the restore. Final state is "Admin User", same as baseline.

## Notification preferences
- 10:05Z Pause for 7 days → PUT /api/notification-preferences 200 (pausedUntil 2026-11-02T10:05:05Z); Resume now → PUT 200 (pausedUntil null). Verified via GET.
- RESIDUAL (can't be undone): timezone went from null to "America/New_York". The card persists the browser-default zone (NotificationPreferencesCard.tsx:116 `data.timezone ?? localTimezone()`), and the schema (shared/notifications.ts:35 min(1)) rejects null, so neither the UI nor the API can set it back to null. Both channels are still off; the other fields match baseline.
- Home layout: Index→Curated (rev 34) → Index (verified). PUT /api/user/preferences ×2.
- Theme: Editorial×Crimson → Geist×Cyan → Geist×Violet (ArrowRight) → Editorial×Violet → Editorial×Crimson. Final GET theme editorial/crimson (verified).

## Collections
- 10:1xZ created collection id 146 "[QA-audit-1026] collection" (POST /api/collections) → /bookmarks?collection=146, empty state shown.
- Bookmarked resource 190125 (AV1-discuss Mailing List) from /resource/190125 with collection 146 checked → POST /api/bookmarks/190125 200, POST /api/collections/146/items/190125 201. Bookmarks 12→13.
- Added note 'QA-audit-1026 note' to bookmark 190125 (POST /api/bookmarks/190125 {notes}); removed 190125 from collection 146 via the detail-page Edit dialog (DELETE /api/collections/146/items/190125).
- Renamed collection 146 to '[QA-audit-1026] collection renamed' (PATCH, Enter submits).
- Deleted collection 146 via UI (Delete → Delete collection) at 390; GET /api/collections → empty; bookmark 190125 survived (count 13), as the dialog says.
- Removed bookmark 190125 via the /bookmarks card 'Remove bookmark' → DELETE 200. Bookmarks back to the 12 baseline ids (verified).
- Favorited 190125 (POST /api/favorites/190125); shown on /profile?tab=favorites; unfavorited on the detail page → favorites back to [185551,186357].

## Submission
- 10:15:57Z: submitted "[QA-audit-1026] member submission" with URL https://example.invalid/qa-audit-1026-member → POST /api/resources 400. The server refuses reserved test domains ("This URL uses a reserved test domain (such as example.com)…"). No row was created: contributions summary unchanged (total 21, pending 0), and search q=QA-audit-1026 returns []. No id to delete. Local draft discarded through Cancel → Discard.

## Journey progress
- Journey 9 step 1: Mark as Complete → PUT /api/journeys/9/progress 200 (completedSteps [217,218,219], 17%, persisted across reload) → Undo → PUT 200, completedSteps [] (verified). currentStepId still 219, same as baseline. lastAccessedAt was likely bumped (side effect, can't be undone).

## Recommendation feedback
- Helpful on resource 190088 → PUT 200 (aria-pressed true, toast) → clicked again → PUT 200 (cleared). GET /api/recommendations/feedback [] before and after.

## End state (10:30:51Z, rev 229f004d) vs baseline
- bookmarks 12, same ids, no notes ✓ · favorites [185551,186357] ✓ · collections [] ✓ · journeys same completed-step counts ✓ · notifications 0 ✓ · recommendation feedback [] ✓
- prefs editorial/crimson, index, same learning values ✓ (revision 33→39 from the saves)
- user name "Admin User", deletionRequestedAt null ✓ · contributions total 21 / pending 0 ✓
- RESIDUAL: notification-preferences timezone null → "America/New_York" (MB-02; can't be reverted)

## Submission (retry with the lead's URL)
- 10:32:30Z submitted "[QA-audit-1026] member submission", URL https://github.com/krzemienski/awesome-list-site/issues/42, category General Tools, description starting "[QA-audit-1026]" → POST /api/resources 201. **Resource id 190349.** check-url before: {exists:false}.
- /contributions: "22 matching contributions"; card contribution-resource-190349 PENDING; button-withdraw-resource-190349 present. API summary pending 1, total 22.
- Withdraw: button-withdraw-resource-190349 → dialog "Withdraw this contribution?" (focus on Keep pending) → Withdraw → POST /api/user/contributions/resource/190349/withdraw 200. Toast "Contribution withdrawn", card shows WITHDRAWN, Withdraw button gone, focus on the card. API: pending 0, withdrawn 1.
- Pre-delete re-read: GET /api/resources/190349 → id 190349, title "[QA-audit-1026] member submission" (prefix OK), status withdrawn, URL matches. (GET /api/admin/resources/:id is 405: no such route; the admin list search doesn't return withdrawn rows.)
- 10:33:28Z DELETE /api/admin/resources/190349 (Origin header) → 200 "Resource deleted successfully" (cleanup all 0).
- Post-delete: GET /api/resources/190349 → 404. Contributions summary back to total 21 / pending 0 / withdrawn 0 (= baseline). /contributions after reload shows 21 and no 190349 card.
