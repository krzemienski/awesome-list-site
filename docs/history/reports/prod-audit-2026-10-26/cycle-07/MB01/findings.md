# C7 MB01 (ux-member) findings — PARTIAL

Worker: sonnet af59163406e54cf1d. Revision 130e5829 at start and end. Evidence: e2e-evidence/cycle-07/MB01/.

Verdict: INCOMPLETE. Rows 002, 003, 005, 007, 008, 010 and 012 PASS at 1440 only. Undriven: 001 (guest), 011, 004 confirm/cancel, 006 "Explore journeys", 009 empty state, and all rows at 820 and 390. Re-chunked as MB01b.

Candidate C7-MB01-01 DISMISSED by the lead: the Profile favorites/bookmarks title links (Profile.tsx:717, :816 on origin/main) measure 32px tall at 390. They are inline links in a list, not buttons, pills, tabs, pagination or menu items, so the brief's 44px touch rule does not cover them, and 32px clears the 24px floor. The footer "PRs welcome" link is 24px, which is at the floor. Not defects.

Owner state, re-read by the lead at 15:5xZ: name "Admin User" (the worker accidentally changed it and then restored it), favorites [186357, 185551], 12 bookmarks. The QA API key `[QA-audit-c7] key30` (f7b27174…) is revoked; revoked keys stay listed by design.
Lead spot-check: I viewed 390-fav.png. It shows the profile header at the iPhone device preset (1170px wide at 3x); counts 2 and 12 match the API.
