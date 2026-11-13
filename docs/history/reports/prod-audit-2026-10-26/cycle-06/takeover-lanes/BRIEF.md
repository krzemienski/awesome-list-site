# Takeover lane brief (cycle 6 completion, shared by every lane)

Goal: drive every row in your lane file on production https://awesome.video, as the end user, at every width the row names ("All" = 1440×900, 820×1180 touch, 390×844 touch). Mark each row PASS, FAIL (a defect, with any severity) or BLOCKED (an exact production or policy reason). A gap is never a PASS. Report every defect you can prove, not only the first.

## Revision
Production serves `bc1797b065c1989ab92f512633f69bf3fe25e718`. At start and end, record `curl -s https://awesome.video/api/version`. If it changes mid-lane, note the time and re-drive any row you passed on the old revision. Nobody deploys while a researcher proof run is active.

## Tools
- Use agent-browser with your own `AGENT_BROWSER_SESSION=<lane id>`, or chrome-devtools MCP with your own `isolatedContext` named after your lane. Never share another lane's session or page.
- agent-browser headless never scrolls, so use a tall viewport or chrome-devtools for content below the fold. Refresh refs after every render. Radix triggers need real pointer clicks, not DOM `.click()`. Activate cmdk options by `data-value` or testid. Export buttons need keyboard Space.
- Every UI PASS needs real navigation plus interaction, an accessibility snapshot or screenshot, and the console/network state. HTTP 200 is not UI proof. Look at every screenshot you cite.
- For QA analytics, set localStorage `umami.disabled`=`1` and decline consent.
- Before you call a failure a product defect, rule out your own tool. Earlier lanes lost hours to stale refs, the fill tool not firing onChange, and pointer downloads hitting the wrong control. Re-drive with a second method and say which one reproduced.

## Owner session (admin and member lanes)
- The cookie jar is `/tmp/aw-prod-owner.jar` and the header file is `/tmp/aw-prod-owner.cookieheader`. Never print their contents.
- The value may reach a command only by shell expansion: `agent-browser cookies set --curl /tmp/aw-prod-owner.cookieheader` or `curl -H "Cookie: $(cat /tmp/aw-prod-owner.cookieheader)"`.
- Never put the value in an MCP argument, extraHttpHeaders, evaluate_script, network dumps or your messages. When you capture requests, record method, URL and status only.
- NEVER sign out the owner, NEVER click "Sign out all devices", and never submit `/sign-in?admin`. Any of these revokes every owner session. Rows that need them are BLOCKED-BY-POLICY.
- If the session dies, report BLOCKED. Do not log in.

## Hard rules (owner, verbatim where quoted)
- "Verification: never write or execute scripts (Playwright/Node/shell harnesses). Drive the real app through the in-app browser / browser tools directly."
- No test files or scripts, no mocks, stubs, fake data or test-mode bypasses. No code edits: you audit, the lead fixes.
- Production writes: only rows you create, titled with the prefix `[QA-audit-1026]`. Delete them by id before you finish, then re-read and confirm 404 or absence. Never edit, delete, approve or reject real rows. Never bulk-approve. Never delete users, never change secrets.
- Never start, cancel or relaunch researcher, enrichment, import, GitHub sync or any other paid or writing job. A researcher proof run is live now; you may view its logs and graph. Rows that need such a job are BLOCKED-BY-LEAD. Dry-run and preview are fine.
- A setting you change on a real account: record its before value, restore it, re-read it, and list it in your report.
- Never print secrets. Stop only processes you started, by PID. Never pkill or killall. Never `agent-browser close --all`.

## Target-size rule
Measure visible interactive elements, excluding .sr-only, aria-hidden, inline links in running text, and card titles covered by an overlay. Below 24px FAILS unless the WCAG spacing exception holds. On touch widths, buttons, pills, tabs, pagination and menu items must be at least 44px. A hover-only control hidden at rest is a FAIL on touch.

## Output
- Save screenshots and raw evidence under `reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/<lane id>/`. Do not write report markdown; you may not be able to.
- Your final message is the report:
  1. A verdict line: PASS (0 findings, 0 open gaps), ISSUES, or BLOCKED.
  2. A findings table with id `T6-<lane number>-NN`, severity, URL, width, saw vs expected, evidence path, likely source `path:line`.
  3. A row matrix with every lane row id, its verdict, widths driven and evidence path. Do not drop any row.
  4. QA rows created and deleted, by id, with the re-read result.
  5. Settings changed and restored, with before and after values.
- If you run low on context or time, return the matrix so far and list exactly which rows are still undriven.

## Context economy (added 19:0xZ after L07/L10 ran out of context at ~20 rows)
- Never let a full snapshot or page dump into your context. Redirect it to a file and grep it: `agent-browser snapshot -i > L??/snap.txt; grep -n 'Delete\|dialog' L??/snap.txt`. With chrome-devtools, pass `filePath` to take_snapshot and take_screenshot.
- Open a screenshot image only when you cite it for a PASS or FAIL, and at most once per row group.
- Drive all three widths for a page in one pass (resize, then re-read the same controls) rather than revisiting the page per row.
- In zsh, never loop over an unquoted `$var` holding a space-separated list (`"820 1180"` stays one word). Use explicit commands per width.
- At ~70% of your context, stop and return the matrix plus the exact undriven rows.
