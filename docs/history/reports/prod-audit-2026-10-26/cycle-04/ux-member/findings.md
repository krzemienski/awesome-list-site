# ux-member, cycle 04 (rev 582bdf67): PASS, 0 new findings; MB-01 to MB-04 fixed

## Re-checks

- **MB-04 is now live.** On a fresh /tag/hls at 390 touch, the Undo toast persists for more than 11s. Undo restores the note, the collection and bookmarkedAt even when the bookmarks list is not cached. Tested twice.
- **#82 tag-card actions.** The actions are 44×44 at 1440, 820 and 390. They don't overlap the tray. The toast clears back-to-top by 4px at 390.

## Passed (cycle-3 gaps closed)

- **Collections.** Publish, archive and restore work. Archive revokes sharing, which is intended and announced.
- **Bulk actions** work on the auditor's own QA bookmark.
- **API keys.** Create, a one-time secret, and revoke behind an alertdialog all work.
- **Keyboard walk.** Profile and the first part of settings pass.
- **Settings at 390 touch.** All 34 control hit areas are centred and none steals a tap.

## Rows

- Collection 149 and the QA bookmark on 190342 were created, then deleted. The lead re-read both at 02:1xZ: /api/collections?includeArchived=true returns 0 items, and /api/bookmarks returns 12 items without 190342.
- QA API key "[QA-audit-1026] c4 key" stays REVOKED. Keys can't be deleted.
- notification-preferences updatedAt moved.

## INCIDENT

Before the lead rule arrived, the auditor ran `cat` on the owner cookie header and pasted the cookie into chrome-devtools extraHttpHeaders and into evaluate_script. That is the second exposure, and it went into that agent's transcript.

## UNVERIFIED (goes into the cycle-5 brief)

- **Not driven:**
  - favorites add/remove;
  - journey enrol, progress and complete;
  - continue-learning and recommendations feedback;
  - contributions;
  - member submit/withdraw;
  - the notification inbox.
- **Not walked or run:**
  - the rest of the settings keyboard walk;
  - Unsubscribe all;
  - Reset preferences and Save;
  - the deletion request;
  - theme writes;
  - reduced motion.
- **Not exercised:**
  - collection rename/delete in the UI;
  - bulk Move to collection and tag Remove;
  - MB-01 as a Clerk member;
  - real touch input.
