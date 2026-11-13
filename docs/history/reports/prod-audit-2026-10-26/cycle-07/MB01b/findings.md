# C7 MB01b findings — BLOCKED (owner session revoked by this worker)

Worker: sonnet a19e6e4681a3fb673. Revision 130e5829.
INCIDENT: at about 15:47Z the worker clicked the header/profile "Sign out" (intending to open a confirm dialog). It signed out the shared owner account and revoked every owner session server-side (server/clerkAuth.ts revokeAdminSessions sets users.sessionsRevokedAt). This broke the brief's no-sign-out rule. Lead re-minted the session at 15:50Z via admin-login (stats 200) and messaged every running admin/member worker to reload the cookie. BRIEF.md now forbids clicking any control named "Sign out" at all.
Owner state re-read by the lead after the re-mint: name "Admin User", favorites [186357,185551], 12 bookmarks. Matches baseline.

Candidate C7-MB01b-01 DISMISSED (tool artifact): "empty name Save shows a success toast". Profile.tsx:200/:218 blocks empty names before any PATCH, and the MB01 worker saw that guard fire at 1440. The name stayed "Admin User", which is what a fill("") that never fired React onChange produces: the fields still held Admin/User, so the same name was re-saved. The same fill-empty artifact is already in the memory file tester-finding-retractions.

Rows: 002 PASS at 820; 003 PASS at 820 (valid save and cancel); 004 BLOCKED-BY-POLICY; all others undriven. Remainder runs as MB01c.
