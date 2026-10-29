# Cycle 7 chunk brief (shared by every chunk worker)

Goal: drive every row in your chunk file on production https://awesome.video as the end user, at 1440×900, 820×1180 (touch) and 390×844 (touch), unless the row names fewer widths. Mark each row PASS, FAIL (a proven defect, any severity) or BLOCKED (an exact production or policy reason). A gap is never a PASS. Report every defect you can prove, not only the first.

## Revision
Production serves `762a6c0dbb90a18a2731a36177985472a8160743` (deploy 3, from about 17:30Z). Confirm with curl before your first row; if it still reports df54342c, wait and re-read. Record `curl -s https://awesome.video/api/version` at start and end. If it changes mid-chunk, note the time and re-drive the rows you passed on the old revision.

## Tools
- Use agent-browser with your own session name `AGENT_BROWSER_SESSION=c7-<chunk>` (example: `c7-PC01`), or chrome-devtools MCP with an `isolatedContext` named `c7-<chunk>`. Never reuse another worker's session name or page.
- agent-browser headless never scrolls: use a tall viewport (same width, height up to 2200) or a DOM click for content below the fold. Refresh refs after every render. Radix triggers need real pointer clicks. Activate cmdk options by `data-value` or testid. Export buttons need keyboard Space. Set touch emulation at 820 and 390.
- Every UI PASS needs real navigation plus interaction, an accessibility snapshot or screenshot, and the console and network state. HTTP 200 is not UI proof. Look at every screenshot you cite.
- For analytics hygiene: set localStorage `umami.disabled`=`1` and decline consent, unless the row is the consent row itself.
- Before you call something a product defect, rule out your own tool: stale refs, a fill that did not fire onChange, smooth-scroll stalls, Radix/cmdk ArrowDown timing, mid-transition focus outlines, pointer clicks on the wrong control. Re-drive with a second method and say which method reproduced it. Read `.agents/memory/tester-finding-retractions.md` and `.agents/memory/audit-cold-boot-flake.md` once before you start.
- Forcing loading or failure states: session-local `agent-browser network route <pattern> --abort` (or a delayed route), then `network unroute`. Never fault production itself.

## Owner session (member and admin rows)
- Cookie jar `/tmp/aw-prod-owner.jar`, header file `/tmp/aw-prod-owner.cookieheader`. Never print, cat, echo or paste their contents.
- Pass the FILE PATH to `cookies set --curl`, never the file's contents (a worker passed `$(cat …)` there; the tool's 'file name too long' error then echoed part of the secret into the transcript). The value reaches a command only by shell expansion: `agent-browser --session c7-<chunk> cookies set --curl /tmp/aw-prod-owner.cookieheader`, or `curl -H "Cookie: $(cat /tmp/aw-prod-owner.cookieheader)" -H "Origin: https://awesome.video"`.
- Never put the value in an MCP argument, extraHttpHeaders, evaluate_script, a network dump or your messages. Request captures record method, URL and status only.
- NEVER click any control whose name contains "Sign out" (Sign out, Sign out all devices), not even to see whether it opens a dialog: on 2026-10-28 15:47Z a worker clicked it "to open the confirm dialog" and it revoked every owner session immediately. Any row about sign-out is BLOCKED-BY-POLICY. NEVER sign out, NEVER click "Sign out all devices", never submit `/sign-in?admin`, never use the signed-in theme picker (it writes server preferences for the shared owner account). Rows that need these are BLOCKED-BY-POLICY.
- If the session dies (admin page shows sign-in, `/api/auth/user` not admin), stop and report BLOCKED. Do not log in.

## Hard rules (owner)
- "Verification: never write or execute scripts (Playwright/Node/shell harnesses). Drive the real app through the browser tools directly." Single `curl` reads are fine. No test files, mocks, stubs, fake data or test-mode bypasses. No code edits: you audit, the lead fixes.
- Production writes: only rows you create, titled with the prefix `[QA-audit-c7]`. Delete them by id before you finish, child rows first, then re-read and confirm 404 or absence. Never edit, delete, approve or reject real rows. Never bulk-approve. Never delete users. Never change secrets.
- Never start, cancel or relaunch the researcher, enrichment, Link Health scans, digest sends, import, GitHub sync/export, reseed or any other paid or writing job. Fill launch forms up to the final button only. Rows that need the job itself are BLOCKED-BY-LEAD (the lead runs each paid job once per pass). Dry runs and previews are fine.
- A setting you change on a real account: record its before value, restore it, re-read it, and list it in your report.
- Stop only processes you started, by PID. Never pkill, killall or `agent-browser close --all`. Close your own session when done: `agent-browser --session c7-<chunk> close`.

## Per-surface constraints
- Admin Resources: create, edit, bulk-select and delete only `[QA-audit-c7]` resources you create. Real-row edit dialogs: open and cancel only.
- Admin taxonomy: build your own `[QA-audit-c7]` chain (category > subcategory > sub-subcategory) when a row needs one. Delete child first, then re-read `/api/categories` against the 9-category baseline.
- Admin approvals/edits: act only on a `[QA-audit-c7]` submission you create through the real /submit form while signed in. An approved QA row becomes public: delete it right away and re-read 404 and the catalog count. Leave real pending items alone.
- Journeys: every journey is real and there is no create control. View, expand and cancel paths are drivable; step save, reorder and delete are BLOCKED-BY-POLICY.
- Admin AI: view logs, graphs and history of past runs freely; do not approve or reject real discoveries.
- Export/db/users: downloads allowed (keep files in your evidence folder, never commit). No restore, reseed, migration or role change; dialogs may be opened and cancelled. No personal data in reports.
- Link health/digests/audit: no scans, no sends, no acting on real reports or contact submissions.
- Member: the owner account is real. Record its before state (favorites, bookmarks, collections, API keys, profile fields, notification prefs), restore exactly, re-read. Account deletion, sign-out controls and second-identity rows are BLOCKED-BY-POLICY.
- Signed-out rows: use a separate session with no cookie. At most one wrong-password attempt on the admin password form; never trip its rate limit.

## Target-size rule
Measure visible interactive elements, excluding .sr-only, aria-hidden, inline links in running text, and card titles covered by an overlay. Below 24px fails unless the WCAG spacing exception holds. On touch widths, buttons, pills, tabs, pagination and menu items must be at least 44px. A hover-only control hidden at rest fails on touch.

## Output
- Save screenshots and raw evidence under `/Users/nick/Desktop/awesome-list-site/e2e-evidence/cycle-07/<chunk>/` (absolute paths; git-ignored). Do not write report markdown.
- Your final message is the report:
  1. Verdict line: PASS (0 findings, 0 open gaps), ISSUES, or BLOCKED.
  2. Findings table: id `C7-<chunk>-NN`, severity, URL, width, saw vs expected, evidence path, second method that reproduced it, likely source `path:line`.
  3. Row matrix: every row id in your chunk, its verdict, widths driven, evidence path. Do not drop any row.
  4. QA rows created and deleted, by id, with the re-read result.
  5. Settings changed and restored, with before and after values.
  6. Revision at start and end.
- If you run low on context or time, return the matrix so far and list exactly which rows are still undriven.

## Context economy
- You start with about 90k tokens of fixed context, which leaves roughly 60-80k for the work. Several workers stopped after 25-35 tool calls. Never pull a snapshot, page text or network dump into your context: always write to a file (filePath / `> file`) and grep for what you need. Open at most one image per row.
- Never let a full snapshot or page dump into your context. Redirect it to a file and grep it: `agent-browser --session c7-PC01 snapshot -i > /abs/path/snap.txt; grep -n 'Delete\|dialog' /abs/path/snap.txt`. With chrome-devtools, pass `filePath` to take_snapshot and take_screenshot.
- Open a screenshot image only when you cite it for a PASS or FAIL, at most once per row group.
- Drive all three widths for a page in one pass (resize, then re-read the same controls).
- zsh: never loop over an unquoted `$var` holding a space-separated list. Use explicit commands per width.
- At about 70% of your context, stop and return the matrix plus the exact undriven rows.
