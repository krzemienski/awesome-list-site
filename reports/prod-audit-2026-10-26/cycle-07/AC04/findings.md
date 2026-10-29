# C7 AC04 (Approvals approve/reject/swipe + Edits tab)
Worker: sonnet a5175be5dadcbb0a0. Revisions 130e5829 then 31d0acce (non-destructive rows re-driven on 31d0acce). Evidence: e2e-evidence/cycle-07/AC04/.
- C7-AC04-01 CONFIRMED, LOW: the pending-edits row resource title is nowrap+ellipsis in a ~128px column ("[QA-aud…" at 390), unreadable on touch; the Recently resolved list wraps. Lead viewed ed05-390.png. Source queues-review.css:169-186. Routed to FIX-C7-10.
- C7-AC04-02 NOT A DEFECT (tool gap): headless cannot swipe; keyboard scroll reaches the hidden columns, and the container is native overflow-x:auto.
PASS: AP-22..25, ED-01..08 at all widths.
QA: 190373-190379 + edit #70 created through /submit and deleted (404). 190379 was public ~16:18-16:23Z; after the lead's message it was deleted and re-read 404. Catalog back to 3,826.
Observation: the "You're offline — couldn't check" message after Check again is sr-only; sighted users see no change. Carried as an open question for AC05 (does the visible control state change?).
