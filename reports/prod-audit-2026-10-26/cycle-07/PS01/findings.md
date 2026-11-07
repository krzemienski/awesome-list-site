# C7 PS01 (ux-public-secondary, /search + /advanced) findings — partial
Worker: sonnet a1ab3093a4b2160de. Revision 130e5829. Evidence: e2e-evidence/cycle-07/PS01/.
Verdict: 0 proven defects. Incomplete: 820 not driven for any row. 390 driven only for 005 (filters sheet), 007 (sizes), 011 (offline), 012.
PASS at 1440: 001 002 003 004 006 008 009 010; 005, 007 and 011 partial; 012 PASS at 390 only.
Gaps carried to the width follow-up (PS01w): every row at 820; 001-004, 006, 008-010 at 390; 012 at 1440; the 011 server-error state and a real Retry click; 005 provider/format/skill facets clicked in the panel.
Tool notes: agent-browser route --abort did not block requests; chrome-devtools Offline worked.
