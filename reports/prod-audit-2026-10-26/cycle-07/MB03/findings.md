# C7 MB03 (bookmarks bulk actions, notes, card actions, library states, journeys)
Worker: sonnet a7228443cf931aeb5. Revision 31d0acce. Evidence: e2e-evidence/cycle-07/MB03/.
PASS at 1440: MB-025, 026, 027, 028, 029. Partial: 030, 031, 036. BLOCKED: 032 (guest-to-member merge needs a second identity), 033/034 (all journeys already enrolled; starting one changes real state), 035 (step progress, policy).
- C7-MB03-01: info only (brief named the old revision).
- C7-MB03-02 UNCONFIRMED: consent banner reappeared after Decline; localStorage held only umami.disabled. PC02 proved on prod that Decline stores analytics-consent=denied and stays dismissed. Likely a mis-click; the lead re-checks it once on prod.
QA: collection 164 created and deleted (/api/collections []); owner bookmarks, favorites and notes restored (re-read by the worker).
Remainder -> MB03b: 025-029 at 820/390; 030 per-card queue status, title/details/external; 031 loading/error/offline; 036 beyond the listing.
