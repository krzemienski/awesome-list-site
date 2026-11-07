# Cycle 2 auditor brief (shared by every slice)

Goal: re-audit https://awesome.video on revision b89d3e4bf12119554b1dd7bcd72fcc2f486bbdcd for a zero-defects verdict. Report every defect you can prove (any severity). Also re-check every cycle-1 and cycle-2 finding in your slice (cycle-02/<slice>/findings.md): FIXED (with evidence) or STILL-OPEN.

## Start gate
Before anything, wait until `curl -s https://awesome.video/api/version` returns revision b89d3e4bf12119554b1dd7bcd72fcc2f486bbdcd (poll every 30s with a bash until-loop, up to 40 min). If it never arrives, report BLOCKED. Record the revision at start and at end.

## Tools
- agent-browser with your own AGENT_BROWSER_SESSION name, or chrome-devtools MCP with your own isolatedContext. agent-browser headless never scrolls (use a tall viewport like 1440x2200 or chrome-devtools for below-fold); Radix triggers need real pointer clicks (chrome-devtools click by uid), not DOM .click().
- Widths: 1440x900, 820x1180 (touch emulation), 390x844 (touch emulation). Reduced motion and keyboard where relevant.
- Single curl reads are fine. QA analytics: set localStorage 'umami.disabled'='1' and dec‍line consent in your browser context.

## Admin/owner session (admin and member slices only)
Cookie jar /tmp/aw-prod-owner.jar and header file /tmp/aw-prod-owner.cookieheader (mode 600; never print their contents). Load the cookie into your browser context (e.g. agent-browser cookies set / chrome-devtools evaluate document.cookie is httpOnly-blocked, so prefer `agent-browser --headers` or setting the cookie through the browser tool's cookie API). Every write via curl needs `-H 'Origin: https://awesome.video'`.
NEVER sign out the owner and never click "Sign out all devices": that revokes every owner session (breaks the whole team). If the session dies, report BLOCKED; do not log in.

## Hard rules (owner, verbatim where quoted)
- "Verification: never write or execute scripts (Playwright/Node/shell harnesses). Drive the real app through the in-app browser / browser tools directly."
- No test files/scripts, no mocks, stubs, fake data, test-mode bypasses. No code edits; you are an auditor.
- Production writes ONLY rows you create, titled with prefix `[QA-audit-1026]`, removed by id before you finish, then confirmed 404/absent. Never edit/delete/approve/reject real rows, never bulk-approve, never delete users, never change secrets, never run research/enrichment/import jobs that write (dry-run/preview is fine). Any unavoidable side effect: log it in created-rows.md.
- Never print secrets.

## Target-size rule (fixed)
Measure visible interactive elements (exclude .sr-only, aria-hidden, inline links in running text, card titles covered by an overlay). <24px FAILS unless the WCAG spacing exception holds. On touch widths, buttons, pills, tabs, pagination and menu items must be >=44px. A hover-only control hidden at rest is a FAIL on touch.

## Output
Do NOT write report files (the harness refuses them). Return the full findings.md content in your final message; save only screenshots and raw evidence under cycle-03/<slice>/. Report table: id (continue cycle-1 prefix numbering, new ids for new findings), severity, URL, width, saw vs expected, evidence path, likely source path:line. Then sections: Cycle-1 re-checks (FIXED/STILL-OPEN each), Passed (with evidence), UNVERIFIED (be honest). Final message: verdict PASS (0 findings) / ISSUES (count by severity) / BLOCKED, plus one line per finding.
