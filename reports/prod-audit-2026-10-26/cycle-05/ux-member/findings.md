# ux-member, cycle 05 (rev 63a1c79d at start and end): ISSUES, 2 MEDIUM and 1 LOW

| id | sev | where | saw vs expected | source |
|---|---|---|---|---|
| MB-05 | MEDIUM | /profile and /recommendations, recommendation cards, 1440 and 390 | "Not for me" and "Already know this" remove the card at once. A 2.5s toast says "Feedback saved" with no Undo, and these two states have no Restore list. A mis-tap can't be recovered in the UI. "Hide" has both Undo and Restore. | recommendation-feedback.tsx:94-120 (ToastAction only for `hidden`); ai-recommendations-panel.tsx:459-463 (`hiddenStates` filter) |
| MB-06 | MEDIUM | /settings Notifications, the "Email digest" and "In-app updates" switches, 1440 | No visible focus indicator. The input matches :focus-visible but is sr-only, and neither the label nor the track styles focus. Sibling checkboxes show a ring. Fails WCAG 2.4.7. | NotificationPreferencesCard.tsx:68-77 (`peer sr-only`, no `peer-focus-visible:` styles) |
| MB-07 | LOW | /journey/9 | Undoing every step resets completedSteps and completedAt, but currentStepId stays at the last step (234 vs a baseline of 219). The UI still shows step 1, so this is stale state only. | updateUserJourneyProgressBatch (learningJourneyRepo), journeys-recommendations.ts:249 |

## Re-checks
- **MB-01 to MB-04:** fixed. MB-04 at 390: the Undo toast was still up after 12s and restore worked.
- **#82 tag-card actions:** not re-driven, so UNVERIFIED.

## Passed
These close the cycle-4 member gaps:
- Favorites.
- Recommendation feedback: Helpful, and Hide with Undo.
- Continue-learning.
- Journey progress and completion, with undo.
- Submit, with validation and focus.
- Withdraw.
- Contributions: filters and empty state.
- Collections: create, rename and delete in the UI.
- Bulk actions: Move, tag Add and tag Remove.
- Notification inbox: empty state, plus the settings jump.
- Settings keyboard walk: 75 stops, no trap. The only stops with no visible ring are the MB-06 switches.
- Touch sweep: 9 pages at 820 and 390.

## Rows
The lead re-read prod at 03:2xZ, using the owner session (admin stats returned 200):
- 190356: 404.
- Collections: 0.
- Bookmarks: 12, the baseline.
- Favorites: [185551,186357], the baseline.
- Recommendation feedback: 0.

Side effects that can't be undone:
- Preferences revision went from 41 to 43. The values equal baseline.
- Journey 9 lastAccessedAt and currentStepId changed (MB-07).

## Incident
The auditor's harness issued a click on "Sign out all devices". The lead confirmed the owner session still works (admin API returns 200), so nothing was revoked.

## UNVERIFIED (into the cycle-6 brief)
- **Not exercised:**
  - A populated inbox.
  - Unsubscribe all, Reset, Save, account deletion and theme writes.
  - The Pause PATCH body.
  - Enrolling in a fresh journey.
  - Offline handling.
  - Reduced motion.
- **Partial coverage:**
  - Touch was checked by emulation only.
  - The keyboard walk was done at 1440 only, not at 820 or 390.
- **Out of reach:** a Clerk member session.
