# C7 AC05 (Edits: conflict, diff dialog, approve/reject flows)
Worker: sonnet ac19845b3cccb43ad. Revision 31d0acce. Evidence: e2e-evidence/cycle-07/AC05/.
- C7-AC05-01 CONFIRMED, MEDIUM: offline "Check again" on the empty Edits queue changes nothing visible; the offline message is sr-only (PendingEdits.tsx ~:382-388). Lead viewed check-again-offline-1440.png. -> FIX-C7-15.
PASS: ED-09..15, 17..20 at all widths (ED-15 confirm at 820/390); ED-16 approval-failure dialog behaves correctly (FAIL is only the tie to AC05-01). QA resource 190380 + edits 71-77 cleaned; lead re-read 190380 = 404.
