---
name: qa-lane
description: Run one browser QA lane of an awesome.video production audit with agent-browser, from driver preflight to graded results. Use when a lane brief says "/qa-lane <lane> on prod at <sha>", when asked to drive a row at 390, 768 and 1280, to grade rows PASS/FAIL/NEEDS_YOU/UNVERIFIED, or to fan lanes out with headless claude -p.
---

# QA lane: drive rows on production and grade them

One lane is a list of rows. Each row runs at three widths and ends in a graded cell with evidence. Production only: `https://awesome.video`. Variables: `RUN_ID` (run folder name), `SHA` (live revision the lane was told to test), `ROOT=.local/audit/$RUN_ID`. Write and read `ROOT` by the absolute path in the checkout the brief names: a worktree has its own `.local/`, so a file written in one is missing in another.

## Safety (read first, these override any brief)

- Never click or visit any control named "Sign out" or "Log out", `/logout`, `/api/auth/logout`, `/api/auth/admin-logout` or logout-all. All lanes share a session, so one sign-out ends every lane.
- Never run `agent-browser cookies get`. Never print or cat `~/.cache/awesome-audit/*`, `.env`, tokens or cookies. Check a session only by status code (for example `GET /api/admin/stats` returns 200).
- Lanes use the cached audit admin and audit member sessions, never the owner account. Load a cached session with `agent-browser --session <lane> cookies set --curl "$HOME/.cache/awesome-audit/<file>" --domain awesome.video`.
- If a loaded session answers 401, sign in again once in this lane's session, never per row: open `/sign-in`, `fill` `#identifier-field`, click Continue, `fill` `#password-field`, submit (selectors from past runs; on a miss take a fresh `snapshot` instead of guessing). Fill each field from its credential file in one call, so the value never enters the transcript: `bash -c 'set -a; . ~/.cache/awesome-audit/audit-admin.env; agent-browser --session <lane> fill "#password-field" "$AUDIT_ADMIN_PASSWORD"'` (`AUDIT_ADMIN_EMAIL` the same way for `#identifier-field`; `member.env` for the member, whose key names you read with `cut -d= -f1`, never the values).
- HARs contain no bodies or personal data. Stop and sanitize the current capture before sign-in or credential entry; save it as the next unique `<lane>-main-NN.har`, then restart on `about:blank` after authentication with the next number. Never overwrite an earlier segment, record credential flows or retain raw HAR exports, cookies, headers, query values, names or emails in evidence.
- Mask other users' emails and names in screenshots, or skip the capture.
- Do not write helper scripts (no `/tmp` `.sh`, `.js` or `.py` wrappers). One-off pipelines with curl and jq are fine.
- A hook block, a declined permission prompt or a sandbox refusal is a stop sign: report it and ask. Never route around it. It stops that one action, not the lane: record it as a pending row and carry on with the other rows.
- Shell is zsh: quote URLs containing `?`, `*` or `==`; use `bash -c` for loops.

## 1. Preflight

1. Driver: `agent-browser` on system Chrome (`--executable-path` to system Chrome; the bundled Chrome 149 floods keydowns). Record `agent-browser --version` and the Chrome version in the lane result. The chrome-devtools MCP gets at most one try with a 10 s timeout; a driver problem is never a BLOCKED grade, switch driver. If you do use the MCP: `take_snapshot` and screenshot `filePath` must be absolute and inside the workspace (`$ROOT/...`; `/tmp` is denied), and `wait_for` takes `text` as a JSON array (`{"text":["Enrichment queue"]}`).
2. `curl -s 'https://awesome.video/api/version'` and record the revision as `shaStart`. If it differs from `SHA`, stop and report.
3. Isolated session: `agent-browser --session <lane> ...` on every command. Open `about:blank` before starting capture; do not open the target first.
4. With a CLI supporting body-free capture, start `agent-browser --session <lane> network har start --content none` while still on `about:blank`, then open the target. This is main segment 01. The installed CLI's documented HAR syntax currently has no `--content` option: a bare `network har start` is not a safe substitute. If no-body capture is unsupported or refused, record HAR as NEEDS_YOU and request a compatible CLI; never fall back to recording bodies. (`har start` in older reports is shorthand for `network har start|stop`.)
5. Consent and analytics: on the site origin set `localStorage` `analytics-consent=denied` and `umami.disabled=1` with `eval`, then reload. Record `navigator.webdriver` once (true means analytics are suppressed; override it only when a row judges analytics).

## 2. Per row, per width (390, 768, 1280)

1. `agent-browser --session <lane> set viewport <w> 900` (a tall viewport such as 1280x2400 for pagers and footers), open the row's URL, wait for `#ssr-seo-hold` to be gone and `#root` to have children, then wait about 2500 ms.
2. Assert `window.innerWidth` equals the width. If not, fix the viewport before anything else.
3. Dismiss overlays (cookie banner, dialogs) with a real click.
4. Drive the row with real pointer clicks and key presses from a fresh `snapshot` (re-snapshot after every navigation). A DOM `.click()` via `eval` is allowed only for below-fold targets headless cannot scroll to; label it in the evidence. Use a held-key retry for Radix radio groups before grading. Rows that judge touch layout run in touch Chrome (below); gaps that remain there are caveats, not failures.
5. Screenshot to `$ROOT/evidence/<lane>/<row>/<width>-<sha>-a<N>.png` (sha = first 8 characters of `shaStart`, `<N>` = drive attempt, 1 for the first drive, 2 for the re-drive). Save console and network output next to it as `<width>-<sha>-a<N>.console.txt` and `<width>-<sha>-a<N>.network.txt`.
6. Grade the cell: PASS, FAIL, NEEDS_YOU (a human or paid step the lane may not do) or UNVERIFIED (could not be exercised; say why). Never infer PASS from an exit code.
7. Re-drive every FAIL once from a clean page. Pass on the second drive: grade FLAKY and keep both evidence sets (`-a1` and `-a2`). Fail again: FAIL.
8. Any row the lane creates (resource, edit, collection) has a title starting `[QA-qa-audit-<RUN_ID>]` so `/api/admin/qa-rows` can delete it. Create such rows only as the audit admin or audit member, and edit only resources that carry your own run's `[QA-qa-audit-<RUN_ID>]` prefix. Two side effects cannot be deleted and are expected, not forbidden: audit-log rows (every QA resource insert, status change and cleanup delete writes one) and `user_interactions` view rows (a signed-in member opening `/resource/:id` writes one). List both in `notes` of the result JSON with the account. Member lanes browse `/resource/:id` signed out unless the row needs sign-in. Never create API keys, journey enrollments, onboarding steps, bookmarks without a cleanup step, or sign-ups other than a throwaway `@example.com` address stopped at the code screen (the cleanup route has no delete path for them): a row that needs one is graded NEEDS_YOU, or UNVERIFIED if it cannot be driven without, and the lane lists any it could not avoid in `notes` (what, which account) for the owner. Cleanup runs at the end of the run (see `defect-loop`, QA cleanup), not in the lane.
9. On a daemon "os error 35", kill the daemon by PID and restart the session. Never run `agent-browser close --all`: it closes every lane's session. Close only your own `--session <lane>`, and only after step 3.1 (the HAR).

## Touch Chrome

`set device` and the blink flags alone leave a fine pointer, so a touch layout gets tested with a mouse. Attach to a touch-emulating system Chrome instead (measured on Chrome 157, 2026-11-16):

1. `mktemp -d /tmp/touch-XXXX` and note the printed directory.
2. In the background: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=<free port> --user-data-dir=<that directory> --touch-events=enabled --blink-settings=primaryPointerType=2,primaryHoverType=1,availablePointerTypes=2,availableHoverTypes=1 about:blank`. Note its PID.
3. Attach without visiting the target: `agent-browser --session <lane>-touch --cdp <port> open about:blank`. Start `agent-browser --session <lane>-touch --cdp <port> network har start --content none` on that blank page, subject to the same no-body support requirement as preflight. Do not open `<url>` until recording has started successfully.
4. Now `agent-browser --session <lane>-touch --cdp <port> open <url>`, then `agent-browser --session <lane>-touch --cdp <port> eval "matchMedia('(pointer: coarse)').matches"` must print `true` before any touch grade. `navigator.maxTouchPoints` stays 0; never grade on it. The HAR includes this initial target navigation.
5. Before stopping that PID, export and sanitize the touch HAR to the next unique `$ROOT/evidence/<lane>/<lane>-touch-NN.har` with the same private-export and field-removal procedure as the main lane. Keep the recording session unchanged: stop with `--session <lane>-touch --cdp <port>`; `NN` belongs only in the output filename. Include every main, touch and auth-restart segment in the result's `nonGet` and `methodTable` accounting.
6. At the end stop only that PID and remove the profile directory by its literal path.

## 3. Finish

1. Stop BEFORE any session close: a close discards the HAR. Export only to an owner-only temporary directory outside the repository, sanitize in the same shell call, and delete the raw export on every exit. Never print or inspect it. Use this inline command, substituting the lane and the next unique absolute `<lane>-main-NN.har` or `<lane>-touch-NN.har` destination; never reuse an existing destination:

   ```bash
   bash -c '
   set -euo pipefail
   umask 077
   scratchDir=$(mktemp -d "${TMPDIR:-/tmp}/qa-har.XXXXXX")
   trap '\''rm -f "$scratchDir/raw.har" "$scratchDir/redacted.har"; rmdir "$scratchDir"'\'' EXIT
   agent-browser --session <lane> network har stop "$scratchDir/raw.har" >/dev/null 2>&1
   jq '\''
     def safe_url:
       if test("^https://awesome[.]video([/?#]|$)") then
         "https://awesome.video" +
         (sub("^https://awesome[.]video"; "") | split("?")[0] | split("#")[0] |
          split("/") | map(if IN("", "api", "admin", "qa-rows", "database-backups", "resources", "resource_edits", "bookmark_collections", "stats", "health", "ready", "version", "auth", "sign-in", "sign-up") then . else ":redacted" end) | join("/"))
       else "https://redacted.invalid/" end;
     {log: {version: "1.2", creator: {name: "qa-lane-redacted", version: "1"}, entries:
       [.log.entries[] | {
         request: {method: (.request.method | if IN("GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE", "CONNECT", "TRACE") then . else "OTHER" end), url: (.request.url | safe_url)},
         response: {status: (.response.status | if type == "number" then . else 0 end)}
       }]}}
   '\'' "$scratchDir/raw.har" > "$scratchDir/redacted.har" 2>/dev/null
   mv "$scratchDir/redacted.har" "<absolute-evidence-destination.har>"
   '
   ```

   This allowlist produces a reduced HAR method/status ledger, not a replayable archive: it removes request `postData`, response `content` (including `text`), both cookie arrays, all request/response headers, query/parameter arrays, redirect URLs, page titles, comments and other metadata. It strips URL query strings/fragments, retains only known fixed awesome.video path segments, redacts dynamic segments and replaces every other origin (including credential-bearing URLs). Body-free capture does not replace this sanitation. On failure keep no export and mark HAR UNVERIFIED; never attach raw files. Read only the sanitized ledger through the jq below.
2. Method table: aggregate every sanitized `<lane>-main-*.har` and `<lane>-touch-*.har`, including every pre-auth/restart segment: `jq -s -r '[.[].log.entries[]] | .[] | .request.method + " " + (.request.url|split("/")[2])' <all-sanitized-segments> | sort | uniq -c`. Every request that is not GET, HEAD or OPTIONS is listed with sanitized URL, method, status and the click that caused it. Correlate redacted paths with the row's non-sensitive route label; never restore query values or dynamic identifiers. Do not explain one away.
3. `curl -s 'https://awesome.video/api/version'` again as `shaEnd`. If it differs from `shaStart`, the lane's cells are void: say so, do not grade.
4. Write `$ROOT/results/<lane>.json`: `{lane, shaStart, shaEnd, driver, harSegments:[...], cells:[{row,width,grade,evidence}], nonGet:[...], methodTable, flaky:[...], notes}`. `harSegments` inventories every main/touch/restart ledger used by the aggregate.
5. Send one `SendMessage` to the lead, at most 5 lines: verdict, SHA, PASS/FAIL/NEEDS_YOU counts, `$ROOT/results/<lane>.json`.

## Headless fan-out (a command, not a script)

Run from the repo root, one lane per `claude -p`, never with `--bare` (that skips the hooks):

```bash
bash -c 'RUN_ID=<RUN_ID>; SHA=<sha>; mkdir -p ".local/audit/$RUN_ID/logs"; printf "%s\n" L1 L2 L3 | xargs -P 2 -I{} bash -c "claude -p \"/qa-lane {} on prod at $SHA\" --model sonnet --allowedTools \"Bash Read Write Edit Grep Glob SendMessage\" > \".local/audit/$RUN_ID/logs/{}.txt\" 2>&1"'
```

Add `--output-format json` when the output must be parsed. `xargs -P 2` keeps to the cap of 2 workers; lanes are judged by their result JSON, not the exit code.
