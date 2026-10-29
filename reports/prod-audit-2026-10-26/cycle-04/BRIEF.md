# Cycle 4 auditor brief (shared by every slice)

Goal: re-audit https://awesome.video on revision 582bdf678443b2b364f247e971b5f01a8c42f797 for a zero-defects verdict. Report every defect you can prove (any severity). Also re-check every cycle-1 and cycle-2 finding in your slice (cycle-02/<slice>/findings.md and cycle-03/<slice>/findings.md): FIXED (with evidence) or STILL-OPEN.

## Start gate
Before anything, wait until `curl -s https://awesome.video/api/version` returns revision 582bdf678443b2b364f247e971b5f01a8c42f797 (poll every 30s with a bash until-loop, up to 40 min). If it never arrives, report BLOCKED. Record the revision at start and at end.

## Tools
- agent-browser with your own AGENT_BROWSER_SESSION name, or chrome-devtools MCP with your own isolatedContext. agent-browser headless never scrolls (use a tall viewport like 1440x2200 or chrome-devtools for below-fold); Radix triggers need real pointer clicks (chrome-devtools click by uid), not DOM .click().
- Widths: 1440x900, 820x1180 (touch emulation), 390x844 (touch emulation). Reduced motion and keyboard where relevant.
- Single curl reads are fine. QA analytics: set localStorage 'umami.disabled'='1' and dec‍line consent in your browser context.

## Admin/owner session (admin and member slices only)
Cookie jar /tmp/aw-prod-owner.jar and header file /tmp/aw-prod-owner.cookieheader (mode 600; never print their contents). Only let the cookie value reach a command through shell expansion, for example `agent-browser --headers "Cookie: $(cat /tmp/aw-prod-owner.cookieheader)" ...` or `curl -H "Cookie: $(cat /tmp/aw-prod-owner.cookieheader)"` (the file holds only the cookie value, so `curl -H @file` sends a malformed header and gets a 401). Never `cat` or `echo` the file on its own, and never paste the value into an MCP tool argument such as chrome-devtools extraHttpHeaders or evaluate_script. Those put the secret into your transcript. Signed-in slices therefore drive the browser with agent-browser. Load the cookie into your browser context (e.g. agent-browser cookies set / chrome-devtools evaluate document.cookie is httpOnly-blocked, so prefer `agent-browser --headers` or setting the cookie through the browser tool's cookie API). Every write via curl needs `-H 'Origin: https://awesome.video'`.
NEVER sign out the owner and never click "Sign out all devices": that revokes every owner session (breaks the whole team). If the session dies, report BLOCKED; do not log in.

## Hard rules (owner, verbatim where quoted)
- "Verification: never write or execute scripts (Playwright/Node/shell harnesses). Drive the real app through the in-app browser / browser tools directly."
- No test files/scripts, no mocks, stubs, fake data, test-mode bypasses. No code edits; you are an auditor.
- Production writes ONLY rows you create, titled with prefix `[QA-audit-1026]`, removed by id before you finish, then confirmed 404/absent. Never edit/delete/approve/reject real rows, never bulk-approve, never delete users, never change secrets, never run research/enrichment/import jobs that write (dry-run/preview is fine). Any unavoidable side effect: log it in created-rows.md.
- Never print secrets.

## Target-size rule (fixed)
Measure visible interactive elements (exclude .sr-only, aria-hidden, inline links in running text, card titles covered by an overlay). <24px FAILS unless the WCAG spacing exception holds. On touch widths, buttons, pills, tabs, pagination and menu items must be >=44px. A hover-only control hidden at rest is a FAIL on touch.

## Output
Do NOT write report files (the harness refuses them). Return the full findings.md content in your final message; save only screenshots and raw evidence under cycle-04/<slice>/. Report table: id (continue cycle-1 prefix numbering, new ids for new findings), severity, URL, width, saw vs expected, evidence path, likely source path:line. Then sections: Earlier-cycle re-checks (FIXED/STILL-OPEN each), Passed (with evidence), UNVERIFIED (be honest). Final message: verdict PASS (0 findings) / ISSUES (count by severity) / BLOCKED, plus one line per finding.

## Cycle-4 additions
- Revision 582bdf67 ships #75 (MB-04 undo toast), #80 (PS-15..21 touch sizes, checkbox/switch 44px hit area below 1024px), #81 (admin follow-ups: Alert live default off / destructive assertive, AI-29, AO-13..15, AC-13, link-health Checked/reconcile note), #82 (tag-card personal actions, back-to-top lane only where needed, PC-23 sticky rail, PG-10 keyboard route focus ring, toast clears back-to-top), #83 (researcher jobs list guard).
- Regression watch (new shared-surface changes): page side gutters and footer at 375/390/820/1024/1366/1440 (no content under back-to-top, no horizontal overflow); checkbox and switch tap areas centred and not stealing neighbours' taps; Alert announcements (a notice that appears after an action must be announced; static notices must not).
- Known minor candidates to judge, not assume: Approvals select-all hit area 44x42 at touch widths; /about "open an issue" link 40px tall and legal links 17-40px on touch.
- Owner session jar was minted 00:19Z 2026-10-27 (12h TTL). If it is dead, report BLOCKED; do not log in.
- Stop only processes you started (by PID). Never pkill/killall by name.
