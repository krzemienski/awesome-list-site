# C7 PC01 (ux-public-core, shell) findings

Worker: sonnet a8271a0691a0ab023. Revision 130e5829 at start (15:30Z) and end (15:43Z). Method: agent-browser at 1440, chrome-devtools isolated context with real touch emulation at 820 and 390. Evidence: e2e-evidence/cycle-07/PC01/.

Verdict: ISSUES. 1 confirmed, 1 dismissed, 1 BLOCKED.
- C7-PC01-01 CONFIRMED, MEDIUM: at 820 and 390 the header Primary nav is hidden, and the drawer lists Home, Submit and About but no Browse, so /categories is unreachable from the chrome. Lead viewed t820-drawer.png (Home/Submit/About only) and origin/main AppSidebar.tsx:959 drawerNavItems (no /categories). Routed to FIX-C7-02.
- C7-PC01-02 DISMISSED: the desktop sidebar is hidden on non-browse routes by design. origin/main layout.css:19 sets `[data-browse-sidebar="false"] > .av-sidebar-shell { display:none }`, and MainLayout.tsx:107 gates it. display:none removes the links from the Tab order, so the "39 focusable" count was a DOM query artifact.

Rows: C6-PC-001 PASS (1440); 002 PASS; 003 PASS (820/390); 004 PASS (390 button only); 005 FAIL (C7-PC01-01); 006 PASS (guest bookmark removed, guest-bookmarks-v1 []); 007 BLOCKED (owner session not used; sign-out policy); 008 PASS (drawer links not each clicked at 820/390); 009 PASS; 010 PASS; 011 PASS; 012 PASS (1440 only; the rail is desktop-only).
Gaps for the width follow-up: 002 brand click at 820/390; 004 Ctrl+K and `/` at 390; 008 drawer links clicked at 820/390; 007 signed-in member menu (MB lanes cover it).
QA rows: none. Settings: none.
