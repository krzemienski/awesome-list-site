# Cycle 6 production member audit — findings

- **Target:** `https://awesome.video`
- **Revision observed at start:** `520d6778369bc7ce495204cfcacc7e0533f941cc` (`reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/revision-start.txt`)
- **Scope:** C6-MB-001–C6-MB-081, using the approved owner session with analytics disabled.
- **Outcome:** **NOT RELEASABLE / audit incomplete.** Two defects are confirmed, including one release-item #82 recheck failure. One QA favorite remains to be removed. Numerous cases were not driven and are explicitly UNVERIFIED below; they are not implicit passes.
- **Evidence caveat:** DOM, accessibility, network and API results were reviewed during the lane. A final image-by-image review of every last-captured PNG was not completed before the forced stop, so this report does not claim completion of the full visual-audit gate. End-of-run `/api/version` was also not captured.

## New defects

### C6-MEMBER-01 — Invalid profile-name submission does not focus the invalid field

- **Row:** C6-MB-003
- **Severity:** Medium
- **Observed:** After a real keyboard clear and invalid submit, validation appears without a PATCH, but focus remains on `Save` rather than moving to the invalid name input. Keyboard and screen-reader users must locate the failing field themselves.
- **Evidence:**
  - `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-003-control-empty-name-1440.png`
  - `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-003-control-empty-name-focus.txt`
  - `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-003-invisible-name-focus.txt`
- **Relevant source:** `client/src/pages/Profile.tsx:212-215`; name inputs at `:1070-1090`.

### C6-MEMBER-02 — `/tag/hls` has card actions below the required 44×44 target size

- **Row:** C6-MB-080 / earlier release item #82
- **Severity:** Medium
- **Observed at 1440×900:** first-card `View details` is 32×32, `Show 2 more tags` is 61.66×32, `Open Link` is 44×32, tag links are about 49.6–56.5×26.8, and the title link is 298.7×41.6. `Suggest an edit`, favorite and bookmark are 44×44. Thus the expected “every action ≥44px” criterion fails even though favorite/bookmark themselves pass.
- **Evidence:**
  - `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-080-first-card-actions-1440.txt`
  - `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-080-targets-under44-1440.txt`
  - `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-080-tag-hls-1440.png`
  - `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-080-tag-hls-1440-snapshot.txt`
- **Coverage limit:** 820/390 geometry, tray overlap and back-to-top/toast collision were not assessed before the stop. Those remain UNVERIFIED, but do not weaken the confirmed 1440 failure.

## Earlier-fix and regression rechecks

- **MB-07 stale journey current step:** PASS. Journey 9 completed all six steps, then all were undone; final state is `currentStepId:217`, `completedSteps:[]`, `completedAt:null`. Evidence: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-035-journey-undone-api.txt` and `MB-035-journey-complete-1440.png`.
- **Release item #103 / recommendation recovery:** PASS. `not_for_me` and `already_known` disappear from active recommendations, appear only in collapsed Restore, survive reload, restore without duplication, and finish with feedback `[]`. Evidence series in `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/`: `MB-038-not-for-me-*` and `MB-038-already-known-*`.
- **Collection rename/delete UI:** PASS during the earlier part of this run; QA collections 151/152 were deleted and confirmed absent in `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/cleanup-qa-collections.txt`.
- **C5 bulk Move:** PASS. First move added two memberships; repeating the identical move left `itemCount:2`, not four. Evidence: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-026-bulk-move-first-api.txt`, `MB-026-bulk-move-duplicate-api.txt`, and corresponding screenshots/snapshots/network files.
- **C5 tag Remove:** PASS in the earlier part of this run; the added personal tag, including the 40-character truncation case, was removed.
- **Continue-learning:** PASS; Resume reached `/journey/9#step-1`, with active/recent/completed content checked.
- **Release item #82:** FAIL, as detailed above.

## Row-by-row verdicts

| Row | Verdict | Evidence and reason |
|---|---|---|
| C6-MB-001 | UNVERIFIED | Fresh sign-in/sign-up/return was not driven. Only the approved existing owner session was used. |
| C6-MB-002 | PASS | Earlier in this run, Overview/Favorites/Bookmarks/Submissions/Security tabs and Back/Forward were exercised at 1440. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-002 captures). |
| C6-MB-003 | **FAIL** | Valid save/cancel and empty/whitespace validation worked, but invalid focus is defective. See C6-MEMBER-01 and `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-003-control-empty-name-focus.txt`. Owner name was restored to `Admin User`; `MB-003-valid-name-restored-1440.png`. |
| C6-MB-004 | BLOCKED | Settings and all-devices confirmation opened and Cancel worked. Actual sign-out/all-device revocation is destructive and was not attempted under the task constraints. |
| C6-MB-005 | PASS | Overview progress, streak and current path were exercised earlier in this run. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-005 captures). |
| C6-MB-006 | PASS | Continue preview and its actual destination were exercised. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-006 captures). |
| C6-MB-007 | PASS | Recommendation panel behavior was exercised. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-007 captures). |
| C6-MB-008 | PASS | Favorite add/remove and baseline restoration passed; empty favorites copy is `No favorites yet.` Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-008 captures). |
| C6-MB-009 | UNVERIFIED | Populated profile bookmarks and title/external links passed; full notes and error-state coverage was not completed. |
| C6-MB-010 | PASS | Submissions summary opened the contribution dashboard. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-010 captures). |
| C6-MB-011 | PASS | Owner-password security view truthfully explains the available account-password/device-management behavior; no replacement identity flow was introduced. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-011 captures). |
| C6-MB-012 | UNVERIFIED | Thirty-/ninety-day key creation, copy, dismiss/refocus passed. One-year, never-expiry and create-error cases were not driven. |
| C6-MB-013 | UNVERIFIED | Status list and cancel/confirm revoke passed; expired-key and revoke-failure behavior was not driven. Revoke-only product behavior leaves revoked records rather than deleting them. |
| C6-MB-014 | UNVERIFIED | Safe open/cancel inspection was not reached. Actual deletion/request failure was not attempted; real account deletion is prohibited by the task. |
| C6-MB-015 | UNVERIFIED | No pending deletion request existed, so withdrawal and withdrawal-error handling were not driven. |
| C6-MB-016 | PASS | Active/Saved/Watch next/In progress/Done/Archived summary filtering was exercised earlier, with zero values rendered only after data load. Additional empty-filter evidence: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-031-no-matches-watch-next-1440.png`. |
| C6-MB-017 | PASS | Desktop collection filter shows exactly two members at `?collection=153`; mobile Collection select switches All saved ↔ collection and preserves URL/count. Evidence: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-017-collection-desktop-state.txt`, `MB-017-collection-desktop-1440.png`, `MB-017-mobile-all-saved-390.png`, `MB-017-mobile-collection-390.png`, and snapshot/console/network companions. This is viewport evidence, not real-touch proof (`navigator.maxTouchPoints` was 0). |
| C6-MB-018 | PASS | Collection create, trimmed rename, blank-disabled submit and cancel were exercised earlier in this run. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-018 captures). |
| C6-MB-019 | PASS | Collection up/down reorder, focus and edge disabling were exercised earlier. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-019 captures). |
| C6-MB-020 | PASS | Collection archive/restore and share revocation behavior were exercised earlier. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-020 captures). |
| C6-MB-021 | PASS | Publish/copy/unpublish worked; public share rendered populated content and then 404/Page Not Found after unpublish. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-021 captures). |
| C6-MB-022 | PASS | Delete cancel/confirm preserved bookmarks while removing collections and public links. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-022 captures), plus collection 153 cleanup below. |
| C6-MB-023 | PASS | Sort was driven through Newest, Oldest, Name A–Z, Name Z–A and Category, then restored. Queue empty state and Active/Archived visibility plus Clear filters worked. Evidence: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-023-sort-oldest-state.txt`, `MB-023-sort-name-asc-state.txt`, `MB-023-sort-name-desc-state.txt`, `MB-023-sort-category-state.txt`, `MB-023-sort-newest-restored-state.txt`, `MB-023-queue-watch-next-state.txt`, `MB-023-visibility-archived-state.txt`, and `MB-023-sort-name-asc-1440.png` with companions. |
| C6-MB-024 | PASS | Select all/individual/clear, selected-count announcement and filter reset were exercised earlier. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-024 captures). |
| C6-MB-025 | UNVERIFIED | Normal bulk queue update and selection clearing passed earlier; partial-failure accounting was not driven. |
| C6-MB-026 | PASS | Real two-item move plus identical duplicate move stayed at two memberships and cleared selection. Evidence: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-026-bulk-move-first-1440.png`, `MB-026-bulk-move-duplicate-1440.png`, `MB-026-bulk-move-first-api.txt`, `MB-026-bulk-move-duplicate-api.txt`, and console/snapshot/network companions. |
| C6-MB-027 | UNVERIFIED | Personal-tag add/remove, blank/40-character behavior passed earlier; partial-failure reporting and proof that no public tag changed were not completed. |
| C6-MB-028 | PASS | Bulk archive/restore emptied the correct views and returned focus to Select all shown. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-028 captures). |
| C6-MB-029 | PASS | New/existing notes, save/cancel and card persistence were exercised earlier. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-029 captures). |
| C6-MB-030 | PASS | Queue status, archive/restore, notes and ResourceCard title/details/external/favorite/bookmark actions were exercised earlier. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-030 captures). |
| C6-MB-031 | UNVERIFIED | No-match Clear filters, empty collection → All saved and empty archived view passed (`MB-031-no-matches-watch-next-1440.png`, `MB-031-empty-collection-1440.png`, `MB-031-archived-empty-1440.png`, `MB-031-clear-filters-state.txt`). Loading, error/Retry and truly empty library were not driven; offline was covered on Settings, not as the full library-state matrix. |
| C6-MB-032 | UNVERIFIED | Guest cap, offline guest saves, sign-in merge, deduplication/notes baseline and failed-merge visibility were not driven. |
| C6-MB-033 | BLOCKED | All five journeys were already enrolled, so fresh-listing enrollment is not eligible without deleting owner progress. Existing Resume works and calls `/api/journeys/9/start`; fresh creation was not claimed. |
| C6-MB-034 | BLOCKED | Same eligible-data blocker for fresh detail enrollment; existing Resume/first-step controls were exercised instead. |
| C6-MB-035 | PASS | Complete-all then undo-all passed and the stale-currentStep regression is fixed. Evidence: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-035-journey-complete-1440.png` and `MB-035-journey-undone-api.txt`. |
| C6-MB-036 | PASS | Continue-learning active/recent/completed content and Resume destination passed at 1440. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-036 captures). |
| C6-MB-037 | PASS | Helpful select/deselect/persist/clear passed; offline write remained pending and retried on reconnect, then was explicitly cleared. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-037 captures). |
| C6-MB-038 | PASS | Both dismissal states, reload, collapsed Restore and no-duplication recovery passed. Evidence series: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-038-not-for-me-*` and `MB-038-already-known-*`. |
| C6-MB-039 | PASS | Hide gave immediate Undo at the same position; later Restore after reload cleared feedback without duplication. Evidence set: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/` (MB-039 captures). |
| C6-MB-040 | UNVERIFIED | Preference writes were completed, but recommendation-cache invalidation and refresh results were not compared for stale content. |
| C6-MB-041 | UNVERIFIED | Contribution search, type/status filters, sort, counts, URL and page reset were not driven. |
| C6-MB-042 | UNVERIFIED | Expanded edit changes, external/public links and rejected/superseded card states were not driven. |
| C6-MB-043 | UNVERIFIED | No new QA contribution was created, so cancel/confirm withdrawal and 409 handling were not driven. |
| C6-MB-044 | UNVERIFIED | Contribution pagination, loading/error/offline, out-of-range, empty and no-match states were not driven. |
| C6-MB-045 | UNVERIFIED | Submit fields, cascading taxonomy resets, validation focus and member editability were not driven. |
| C6-MB-046 | UNVERIFIED | Duplicate/reserved/malformed/server-rejected URL checks were not driven. |
| C6-MB-047 | UNVERIFIED | Draft restore, cross-tab winner and Cancel Keep editing/Discard flows were not driven. |
| C6-MB-048 | UNVERIFIED | Valid resource submission, pending timeline, draft clearing and another-submission path were not driven; no QA contribution was left behind. |
| C6-MB-049 | UNVERIFIED | Auth pending/failing/signed-out and Retry states were not driven. |
| C6-MB-050 | BLOCKED | Actual inbox was empty (`unreadCount:0`, `notifications:[]`), so populated unread/open/Mark-read behavior could not be proven without an external event or prohibited job. Empty-state behavior was checked; populated behavior was not upgraded by assumption. |
| C6-MB-051 | UNVERIFIED | Empty inbox links to Settings. Mark all read, populated focus handoff and mutation-failure behavior were unavailable/not driven; full loading/error/offline matrix was not completed. |
| C6-MB-052 | PASS | Channels, three sections, cadence and timezone were exercised; invalid input produced no PUT and inline `Choose a valid IANA time zone.` with `aria-invalid=true` and an INPUT focused. Evidence: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-052-invalid-timezone-1440.png`, `MB-052-invalid-timezone-state.txt`, `MB-052-invalid-timezone-focus.txt`, and snapshot/console/network companions. Baseline was restored and confirmed in `MB-055-preferences-restored-api.txt`. |
| C6-MB-053 | UNVERIFIED | Pause wrote future `pausedUntil:2026-11-03T07:17:51.717Z`, preserved other fields, and Resume returned null (`MB-053-paused-api.txt`, `MB-053-resumed-api.txt`, `MB-053-paused-1440.png` and companions). The separate dirty-form/quick-action distinction was not driven. |
| C6-MB-054 | UNVERIFIED | Unsubscribe all set both flags false and disabled the action without resetting sections/cadence/timezone (`MB-054-unsubscribe-all-1440.png`, `MB-054-unsubscribe-all-api.txt`, and companions). Production used PATCH 200. Dirty-edit wording was not driven. |
| C6-MB-055 | UNVERIFIED | Valid full-body Save returned 200 and persisted both channels/monthly/UTC before restoration (`MB-055-preferences-saved-1440.png`, `MB-055-preferences-saved-api.txt`, and companions). Server failure/conflict behavior was not driven. |
| C6-MB-056 | UNVERIFIED | Populated preview displayed real new-resource and journey links. Empty and error variants were not driven. |
| C6-MB-057 | UNVERIFIED | Token GET confirmation, valid POST, used-link 410 and invalid-link behavior were not driven. |
| C6-MB-058 | PASS | Appearance, Account, Security, Recommendations and Bookmarks cards all reached their intended routes; Back returned home. Bookmarks card navigation was rechecked directly. Appearance evidence: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-060-theme-restored-1440.png`; bookmarks evidence begins at `MB-017-collection-desktop-1440.png`. |
| C6-MB-059 | UNVERIFIED | Member Index/Curated PUTs and actual home render passed (`MB-072-home-curated-1440.png`, `MB-072-home-index-restored-1440.png` and companions); offline paused mutation resumed and was restored to Index (`MB-075-reconnected-layout-api.txt`, `MB-075-layout-restored-api.txt`). Guest persistence and save-error semantics were not driven. |
| C6-MB-060 | UNVERIFIED | All five learning-preference groups rendered and were edited/restored, but missing-required-group validation and a deliberate non-baseline change of every group were not completed. Reset/editor evidence: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-062-learning-reset-1440.png` and `MB-061-learning-restored-1440.png`. |
| C6-MB-061 | UNVERIFIED | Complete profile Save returned 200 with expected values and success toast (`MB-061-learning-restored-1440.png`, `MB-061-learning-restored-api.txt`, and companions). Conflict/server-error behavior was not driven. |
| C6-MB-062 | UNVERIFIED | Confirmed Reset issued DELETE 200, returned the empty chooser and preserved bookmarks/progress (`MB-062-learning-reset-1440.png`, `MB-062-learning-reset-api.txt`, and companions). Reset Cancel and failure restoration were not driven. |
| C6-MB-063 | UNVERIFIED | Empty chooser and populated editor passed; offline taxonomy failed and recovered on reconnect. Skeleton and explicit learning-load Retry were not fully driven. |
| C6-MB-064 | UNVERIFIED | Geist/Magenta changed live DOM/account writes, then Editorial/Crimson persisted after reload (`MB-060-theme-geist-magenta-inter-1440.png`, `MB-060-theme-restored-1440.png`, `MB-060-theme-restored-state.txt`, and companions). Conflict/offline/retry reconciliation was not driven. |
| C6-MB-065 | UNVERIFIED | Inter and System default were changed and restored; every other font and cross-tab persistence were not driven. |
| C6-MB-066 | UNVERIFIED | Beginner step 1 → Continue → step 2 worked with in-progress PUT/URL (`MB-063-onboarding-step1-1440.png`, `MB-063-onboarding-step2-1440.png`). Intermediate/Advanced and heading-focus proof were not completed. |
| C6-MB-067 | UNVERIFIED | Existing Encoding & Codecs topic survived Back/Forward and valid Continue (`MB-063-onboarding-step2-1440.png`). Zero-topic Continue was not attempted. |
| C6-MB-068 | UNVERIFIED | Existing Learn the fundamentals goal survived Back/Forward and valid Continue (`MB-063-onboarding-step3-1440.png`). Zero-goal Continue was not attempted. |
| C6-MB-069 | UNVERIFIED | Existing Videos format survived Back/Forward and valid Continue (`MB-063-onboarding-step4-1440.png`). Zero-format Continue was not attempted. |
| C6-MB-070 | UNVERIFIED | Step 5 Save marked onboarding completed with all baseline values and completion links (`MB-063-onboarding-step5-1440.png`, `MB-063-onboarding-saved-1440.png`, `MB-063-onboarding-saved-api.txt`). Save-error retention was not driven. |
| C6-MB-071 | UNVERIFIED | Back through all five steps and Continue forward worked with matching URLs. Browser Back/Forward and mid-flow reload/stale-draft reconciliation were not driven. |
| C6-MB-072 | UNVERIFIED | Completed view offers personalized recommendations and catalog, and completing again preserved values (`MB-063-onboarding-saved-1440.png`). `Save and browse later` was not clicked, so skip/dismiss semantics remain unverified. |
| C6-MB-073 | UNVERIFIED | Preference/category load failure and save failure with intact inputs/no false completion were not deliberately driven on onboarding. |
| C6-MB-074 | UNVERIFIED | Active key returned 200 for `/api/public/me`, resources, categories and tags; wrong key returned 401 without exposing another identity. Revoked-key-specific and expired-key rechecks were not performed because secrets were not retained; no additional keys were created merely for coverage. |
| C6-MB-075 | UNVERIFIED | Representative offline checks passed: Settings notification read said `You’re offline…Try again`; home-layout mutation showed `Saving…`, not a false success, and resumed on reconnect. Evidence: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-075-settings-offline-read-390.png`, `MB-075-settings-offline-alerts-390.txt`, `MB-075-home-layout-offline-820.png`, `MB-075-reconnected-820.png`, `MB-075-reconnected-layout-api.txt`, and companions. The full “each mutation” matrix and all rollback cases were not driven. |
| C6-MB-076 | UNVERIFIED | Reduced-motion samples passed at 390/820/1440: media query true, `scrollBehavior:auto`, no active animations, journey/progress, dialog cancel/focus and favorite toast remained understandable. Evidence: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-076-journey-820.png`, `MB-076-dialog-390.png`, `MB-076-favorite-toast-1440.png`, and state/snapshot/console companions. Not every member surface was walked. |
| C6-MB-077 | BLOCKED | Real coarse-pointer device proof was not available in the approved lane. `set device iPhone 12` produced 390×844 but `navigator.maxTouchPoints:0`; emulation was not promoted to real-touch evidence (`MB-017-mobile-viewport.txt`). |
| C6-MB-078 | UNVERIFIED | Full keyboard-only walks at 820 and 390, including notification-switch visibility and dynamic-focus handoff, were not completed. |
| C6-MB-079 | BLOCKED | A real non-owner Clerk member sign-in/out/isolation check was not permitted or available in this lane. The approved owner/admin session is not presented as member-parity proof. This is a task/session constraint, not an API-credential diagnosis. |
| C6-MB-080 | **FAIL** | Confirmed sub-44 card actions at 1440; see C6-MEMBER-02. Favorite POST for resource 190342 succeeded (`MB-080-favorite-added-1440-network.txt`), but 820/390 geometry, bookmark mutation, tray and back-to-top collision checks were not completed. |
| C6-MB-081 | UNVERIFIED | Canonical/legacy `/api/submit`, `/api/user/submissions`, delete-withdraw alias, `/api/recommendations/feedback` and `/api/interactions` compatibility were not driven. |

## QA cleanup and restoration

### Confirmed clean/restored

- All cycle-6 API keys revoked: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/cleanup-active-qa-keys.txt` is `[]`.
- Earlier QA bookmark row 190342 deleted; `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/cleanup-qa-bookmark.txt` reports `{count:12,qa:0}`.
- Earlier QA collections 151/152 deleted: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/cleanup-qa-collections.txt` is `[]`.
- QA collection 153 used for bulk Move was deleted by id; `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/cleanup-qa-move-collection.txt` confirms `collections:[]` and `bookmarks:12`. `cleanup-qa-move-collection-network.txt` records DELETE 200.
- Recommendation feedback is empty.
- Owner display name is restored to `Admin User`.
- Journey 9 is back to zero completed steps with coherent current step.
- Notification baseline restored and API-confirmed: both channels false, all three sections true, weekly, `America/New_York`, `pausedUntil:null`: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-055-preferences-restored-api.txt`.
- Home layout restored to `index`: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-075-layout-restored-api.txt`.
- Learning baseline restored: Beginner, Encoding & Codecs, learn-fundamentals, video, flexible; `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-061-learning-restored-api.txt`.
- Appearance restored to Editorial/Crimson/System default and persisted after reload: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-060-theme-restored-state.txt`.
- Favorite resource 184751 used for reduced-motion toast was removed; baseline favorites at that point were `[186357,185551]`: `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-076-favorites-restored-api.txt`.
- Browser was reconnected after offline checks and reduced-motion was reset to light.

### Known residue requiring owner cleanup

- **Favorite for MediaMTX resource 190342 was added and not removed before the forced stop.** The successful mutation is recorded in `reports/prod-audit-2026-10-26/cycle-06/ux-member/run-20261027-c6mb/MB-080-favorite-added-1440-network.txt` (`POST /api/favorites/190342` 200 followed by GET 200). Remove that favorite through the UI and confirm its absence from `/api/favorites`. Do not confuse this favorite with the earlier, already-deleted bookmark row having the same numeric id.
- No final post-cleanup favorites fetch or end-revision capture was possible after the abort; no clean-slate claim is made.
