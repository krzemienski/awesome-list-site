---
name: qa-lane
description: Run one browser QA lane of an awesome.video production audit with agent-browser, from driver preflight to graded results. Use when a lane brief says "/qa-lane <lane> on prod at <sha>", when asked to drive a row at 390, 768 and 1280, to grade rows PASS/FAIL/NEEDS_YOU/UNVERIFIED, or to fan lanes out with headless claude -p.
---

# QA lane: drive rows on production and grade them

One lane is a list of rows. Each row runs at three widths and ends in a graded cell with evidence. Production only: `https://awesome.video`. Variables: `RUN_ID` (run folder name), `SHA` (live revision the lane was told to test), `ROOT=.local/audit/$RUN_ID`.

## Safety (read first, these override any brief)

- Never click or visit any control named "Sign out" or "Log out", `/logout`, `/api/auth/logout`, `/api/auth/admin-logout` or logout-all. All lanes share a session, so one sign-out ends every lane.
- Never run `agent-browser cookies get`. Never print or cat `~/.cache/awesome-audit/*`, `.env`, tokens or cookies. Check a session only by status code (for example `GET /api/admin/stats` returns 200).
- Lanes use the cached audit admin and audit member sessions, never the owner account. Load a cached session with `agent-browser --session <lane> cookies set --curl "$HOME/.cache/awesome-audit/<file>" --domain awesome.video`.
- Mask other users' emails and names in screenshots, or skip the capture.
- Do not write helper scripts (no `/tmp` `.sh`, `.js` or `.py` wrappers). One-off pipelines with curl and jq are fine.
- A hook block is a stop sign: report it and ask. Never route around it.
- Shell is zsh: quote URLs containing `?`, `*` or `==`; use `bash -c` for loops.

## 1. Preflight

1. Driver: `agent-browser` on system Chrome (`--executable-path` to system Chrome; the bundled Chrome 149 floods keydowns). Record `agent-browser --version` and the Chrome version in the lane result. The chrome-devtools MCP gets at most one try with a 10 s timeout; a driver problem is never a BLOCKED grade, switch driver.
2. `curl -s 'https://awesome.video/api/version'` and record the revision as `shaStart`. If it differs from `SHA`, stop and report.
3. Isolated session: `agent-browser --session <lane> ...` on every command.
4. Start the HAR now: `agent-browser --session <lane> network har start`. (LANE-RULES writes `har start`; that is shorthand, the real command is `network har start|stop`.)
5. Consent and analytics: on the site origin set `localStorage` `analytics-consent=denied` and `umami.disabled=1` with `eval`, then reload. Record `navigator.webdriver` once (true means analytics are suppressed; override it only when a row judges analytics).

## 2. Per row, per width (390, 768, 1280)

1. `agent-browser --session <lane> set viewport <w> 900` (a tall viewport such as 1280x2400 for pagers and footers), open the row's URL, wait for `#ssr-seo-hold` to be gone and `#root` to have children, then wait about 2500 ms.
2. Assert `window.innerWidth` equals the width. If not, fix the viewport before anything else.
3. Dismiss overlays (cookie banner, dialogs) with a real click.
4. Drive the row with real pointer clicks and key presses from a fresh `snapshot` (re-snapshot after every navigation). A DOM `.click()` via `eval` is allowed only for below-fold targets headless cannot scroll to; label it in the evidence. Use a held-key retry for Radix radio groups before grading. Touch-emulation gaps are caveats, not failures.
5. Screenshot to `$ROOT/evidence/<lane>/<row>/<width>-<sha>.png` (sha = first 8 characters of `shaStart`). Save console and network output next to it as `<width>-<sha>.console.txt` and `<width>-<sha>.network.txt`.
6. Grade the cell: PASS, FAIL, NEEDS_YOU (a human or paid step the lane may not do) or UNVERIFIED (could not be exercised; say why). Never infer PASS from an exit code.
7. Re-drive every FAIL once from a clean page. Pass on the second drive: grade FLAKY and keep both evidence sets. Fail again: FAIL.
8. Any row the lane creates (resource, edit, collection, sign-up) has a title starting `[QA-qa-audit-<RUN_ID>]` so `/api/admin/qa-rows` can delete it. Cleanup runs at the end of the run as an account in `QA_CLEANUP_USER_IDS`, not in the lane.
9. On a daemon "os error 35", kill the daemon by PID and restart the session.

## 3. Finish

1. `agent-browser --session <lane> network har stop $ROOT/evidence/<lane>/<lane>.har`.
2. Method table: `jq -r '.log.entries[] | .request.method + " " + (.request.url|split("/")[2])' <har> | sort | uniq -c`. Every request that is not GET, HEAD or OPTIONS is listed with URL, method, status and the click that caused it. Do not explain one away.
3. `curl -s 'https://awesome.video/api/version'` again as `shaEnd`. If it differs from `shaStart`, the lane's cells are void: say so, do not grade.
4. Write `$ROOT/results/<lane>.json`: `{lane, shaStart, shaEnd, driver, cells:[{row,width,grade,evidence}], nonGet:[...], methodTable, flaky:[...], notes}`.
5. Send one `SendMessage` to the lead, at most 5 lines: verdict, SHA, PASS/FAIL/NEEDS_YOU counts, `$ROOT/results/<lane>.json`.

## Headless fan-out (a command, not a script)

Run from the repo root, one lane per `claude -p`, never with `--bare` (that skips the hooks):

```bash
bash -c 'RUN_ID=<RUN_ID>; SHA=<sha>; mkdir -p ".local/audit/$RUN_ID/logs"; for lane in L1 L2 L3; do claude -p "/qa-lane $lane on prod at $SHA" --allowedTools "Bash Read Write Edit Grep Glob SendMessage" > ".local/audit/$RUN_ID/logs/$lane.txt" 2>&1 & done; wait'
```

Add `--output-format json` when the output must be parsed. Keep to the concurrency cap the run brief sets.
