# C7 MB01c (ux-member remainder)
Worker: sonnet a671c71bdb4e068b8. Revision 130e5829. Evidence: e2e-evidence/cycle-07/MB01c/.
Verdict: 0 findings. Rows 002, 003, 005-012 PASS at 1440/820/390 (signed-in touch was viewport-only; the guest session used real touch). 004 PASS (Settings link only); its sign-out parts are BLOCKED-BY-POLICY. 001: the guest redirect to /sign-in passes; the sign-in-and-merge part is BLOCKED-BY-POLICY (no login, no second identity).
QA: API keys "[QA-audit-c7] mb01c 390/820" created and revoked (no delete API; 14 keys, 0 active).
Owner state re-read by the lead at 16:2xZ: name Admin User, role admin, favorites [186357,185551], 12 bookmarks. Side effect: Resume touched journey 9's last-accessed time (expected for the action).
The member lane rows 001-012 are now covered except the policy-blocked parts.
