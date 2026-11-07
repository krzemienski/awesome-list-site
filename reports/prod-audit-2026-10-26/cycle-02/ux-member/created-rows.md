# ux-member cycle-2 created / changed rows (owner account, live awesome.video rev c25cd76f)

Baseline: baseline.md (16:58:06Z). Every write below was made through the UI unless marked curl.

## Notification preferences
- 17:05:49Z Pause for 7 days -> PATCH /api/notification-preferences body `{"pausedUntil":"2026-11-02T17:05:49.426Z"}` 200 (net-pause-patch-request-body.json)
- 17:06:31Z Resume now -> PATCH body `{"pausedUntil":null}` 200 (net-resume-patch-request-body.network-request / -response.network-response)
- GET after: timezone "America/New_York" (unchanged), pausedUntil null. Side effect: updatedAt bumped 10:05:07Z -> 17:06:31Z (not restorable).

## Collections
- 17:10:47Z created collection id 147 "[QA-audit-1026] collection" (UI, 820 touch)
- 17:12Z bookmarked resource 190125 (AV1-discuss Mailing List) from /resource/190125 (820 touch) with note "QA-audit-1026 note" and collection 147 checked -> GET: bookmark notes set, collectionIds [147], bookmarks 12 -> 13. Toast "Added to bookmarks".
- 17:14Z renamed collection 147 -> "[QA-audit-1026] collection renamed" (Enter submits; GET confirms).
- 17:15Z edited note on bookmark 190125 -> "QA-audit-1026 note edited" (card Note dialog; GET confirms).
- 17:16Z deleted collection 147 via Delete -> "Delete collection" (390 touch). GET /api/collections -> []; bookmark 190125 kept (13 bookmarks, collectionIds []).
- 17:17Z removed bookmark 190125 from its /bookmarks card (390 touch) -> 12 bookmarks.
- 17:19-17:24Z toast checks on bookmark 190125 (all UI, 390 touch): re-added (no note) on detail page -> removed on /bookmarks ("Bookmark removed"+Undo seen); re-added -> removed on detail page -> Undo (restored, 13) -> removed on detail page (Undo toast still open after 10 s); re-added -> removed on /bookmarks (Undo toast auto-hid after 6.0 s). Final: 12 bookmarks, 190125 absent.

## Favorites
- 17:20Z Favorite on resource 190125 (detail page, 390 touch) -> favorites [190125,185551,186357], aria-pressed true, toast "Added to favorites"; Unfavorite -> [185551,186357] (= baseline), toast "Removed from favorites".

## Journey progress
- 17:27Z /journeys "Continue Journey" on journey 9 -> /journey/9#step-1 (no write). Mark as Complete step 1 -> completedSteps [217,218,219], 17%, toast "Progress Updated"; Undo (Enter) -> completedSteps [], currentStepId 219 (= baseline). Side effect: lastAccessedAt bumped (not restorable).

## Recommendation feedback
- ~17:23Z (server clock) /recommendations Helpful on resource 189969 -> feedback [189969 helpful], aria-pressed true; clicked again -> feedback [] (= baseline), aria-pressed false.

## Submission
- ~17:25Z /submit (1440): "[QA-audit-1026] member submission", URL https://github.com/krzemienski/awesome-list-site/issues/42 (check-url before: {"exists":false}), category Media Tools, description starting "[QA-audit-1026]" -> "Submission Successful!" **Resource id 190352**, pending, canWithdraw true. Summary total 22 / pending 1.
- Note: another slice's row 190351 "[QA-audit-1026] c2 resource renamed" (created 17:02:10Z on this shared owner account) was pending at 17:04Z and gone by 17:25Z. Not mine; untouched.
- ~17:25:40Z /contributions (820 touch): Withdraw [QA-audit-1026] member submission -> alertdialog (focus on "Keep pending") -> Withdraw. GET /api/resources/190352 (owner) -> status withdrawn, title prefix OK, URL matches; card WITHDRAWN, Withdraw button gone, focus on the card, toast "Contribution withdrawn". Summary pending 0 / withdrawn 1.
- 17:26:10Z curl DELETE /api/admin/resources/190352 (Origin header, after an authenticated title-prefix check) -> 200 "Resource deleted successfully" (cleanup all 0). GET (owner and anon) -> 404. Summary total 21 / pending 0 / withdrawn 0 (= baseline).

## Settings
- ~17:28Z home layout Index -> Curated (PUT /api/user/preferences, rev 40) -> Index (rev 41). Learning-prefs save with 0 topics was blocked client-side (no PUT); the unsaved checkbox edit was discarded by reload.

## End state (17:30Z, rev c25cd76f) vs baseline (16:58Z)
- auth/user, notification-preferences, bookmarks, favorites, collections, user/journeys, user/preferences, notifications, recommendations/feedback, contributions summary + item ids: all SAME (volatile fields excluded). Raw: baseline/ and end/.
- Residual, non-restorable: notification-preferences updatedAt 10:05:07Z -> 17:06:31Z; preferences revision 39 -> 41; journey 9 lastAccessedAt 10:18:56Z -> 17:22:27Z. Timezone stayed "America/New_York".
- Rows I created and removed: collection 147 (deleted, GET /api/collections []), resource 190352 (deleted, GET 404). No row left behind.
