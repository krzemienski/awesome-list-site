# Cycle 5 auditor brief (shared by every slice)

Goal: re-audit https://awesome.video on revision 63a1c79dbc99bfa6edf2c43d56510dddd36da313 for a zero-defects verdict. Report every defect you can prove (any severity). Also re-check every cycle-1 and cycle-2 finding in your slice (cycle-02, cycle-03 and cycle-04/<slice>/findings.md): FIXED (with evidence) or STILL-OPEN.

## Start gate
Before anything, wait until `curl -s https://awesome.video/api/version` returns revision 63a1c79dbc99bfa6edf2c43d56510dddd36da313 (poll every 30s with a bash until-loop, up to 40 min). If it never arrives, report BLOCKED. Record the revision at start and at end.

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
Do NOT write report files (the harness refuses them). Return the full findings.md content in your final message; save only screenshots and raw evidence under cycle-05/<slice>/. Report table: id (continue cycle-1 prefix numbering, new ids for new findings), severity, URL, width, saw vs expected, evidence path, likely source path:line. Then sections: Earlier-cycle re-checks (FIXED/STILL-OPEN each), Passed (with evidence), UNVERIFIED (be honest). Final message: verdict PASS (0 findings) / ISSUES (count by severity) / BLOCKED, plus one line per finding.

## Cycle-5 additions
- Revision 63a1c79d ships these PRs:
  - #86, PC-24: header aria-current. "page" only on an exact match; "true" for the Browse section.
  - #87:
    - PS-16: chip names for category, subcategory and sub-subcategory, also on invalid sort.
    - AO-16: link-health chart. Legend on top, ticks inside the SVG at every width.
    - AO-17: audit statuses.
  - #88, PG-08: a fragment link scrolls to and focuses its target. Back restores scroll and focuses only an element in view.
  - #89:
    - AC-14: Approvals select-all is 44×44 on touch.
    - AC-16 and AC-17: edit titles and journey-step links are ≥44px on touch.
    - AC-18: a duplicate-URL server error marks the URL field, which gets focus, aria-invalid and aria-describedby.
  - #90:
    - PS-22: the error page auto-retries network failures.
    - PS-23: the mobile Filters sheet stays open while toggling. Done returns focus to the trigger.
    - PS-24: export option rows have a 44px pitch.
  - #91:
    - PS-25: subSubcategory accepts a slug or a name.
    - AO-18: more audit statuses. "degraded" shows as warn.
- Known, in flight, do not re-file: PS-26. The app-level ErrorPage (whole catalog fails at first load) has no Retry and no auto-recover.
- Regression watch for this release's shared changes:
  - Route focus and scroll on every navigation type: link, keyboard, Back, Forward, fragment and first load.
  - The Search page and its Filters sheet.
  - Error and offline pages.
  - The audit tab chips.
- Cycle-4 UNVERIFIED items you must cover now (a gap is not a pass):
  - **a11y:**
    - Switch focus ring, through a signed-in settings page.
    - Geist pointer route focus at 820.
    - Offline then reconnect at 820.
    - The lime, rose, emerald, amber and matrix accents' contrast.
    - Favorite toast announcement.
  - **member:**
    - Favorites add/remove.
    - Journey enrol, progress and complete.
    - Continue-learning and recommendations feedback.
    - Contributions.
    - Member submit/withdraw.
    - Notification inbox.
    - The full settings keyboard walk.
    - Collection rename/delete in the UI.
    - Bulk Move to collection and tag Remove.
  - **admin-content:**
    - AC-01 to AC-05, AC-07 (741–895 widths), AC-10 and AC-11 (long scroll), HDR-01.
    - Resources rows-per-page and sort.
    - Categories edit.
  - **public-core:**
    - Rail at 1100–1250.
    - Drawer backdrop close.
    - Sub-subcategory touch sweep.
    - PC-01 to PC-09 and PC-11.
  - **admin-ops:**
    - Users touch with emulation.
    - Export 5xx toast wording, by code if production can't produce one.
- Owner session: the jar was minted at 00:19Z on 2026-10-27, with a 12h TTL. Pass the cookie only by shell expansion:
  - (`agent-browser --headers` expects JSON; do not use it for the cookie)
  - or `agent-browser cookies set --curl /tmp/aw-prod-owner.cookieheader`
  - or `curl -H "Cookie: $(cat /tmp/aw-prod-owner.cookieheader)"`
- Never cat or echo the file on its own. Never put the value in an MCP tool argument. Signed-in slices use agent-browser. If the session is dead, report BLOCKED. Never sign out.
- Stop only processes you started (by PID). Never pkill/killall by name. Never `agent-browser close --all`.
