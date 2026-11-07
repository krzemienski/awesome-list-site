**Verdict: ISSUES.** All 12 rows were driven at all three widths. 10 PASS and 2 FAIL (OV-11, OV-14), with 3 low-severity findings and 1 note.

The agent-browser session `L05a` ran against production revision `bc1797b065c1989ab92f512633f69bf3fe25e718`. It was the same at the start and at 19:32Z. The owner session was used through the cookie file only, and the owner was never signed out. Evidence is in `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L05a/`.

**How the states were forced.** There was no throttle or route control that worked, and `network route --abort` silently did nothing. I navigated to `/about`, patched `window.fetch` in the page with `eval`, then did an SPA `pushState` to `/admin` so every query started cold. This makes the failure, empty and loading states real in the UI, but the injected failures never reach the server. No script files were written.

## Findings

| id | severity | URL / width | Saw vs expected | evidence | source |
|---|---|---|---|---|---|
| T6-05a-01 | low | `/admin` Overview, 1440 | The Top categories Retry succeeded and the list rendered, but the metric-strip banner "Couldn't load stats for categories" and the Resources tile "category data unavailable" stayed until the banner's own Retry was clicked. The two sections read `/api/categories` under different query keys, so one section's retry never refreshes the other. Expected: one source, one state. | `ov13-inconsistent-1440.png` | `AdminStats.tsx:137` vs `AdminOverview.tsx:~348` |
| T6-05a-02 | low | `/admin` Overview, 1440 | When every category has `resourceCount` 0, Top categories shows five rows with 0 and empty bars. Expected "No categories have approved resources." The empty-array case does show the right text. There is no filter on count greater than 0. | `ov08-empty-1440.png`; the zero-count run's output was seen but not saved | `AdminOverview.tsx:387-392,501,529` |
| T6-05a-03 | medium | `/admin` Overview, 1440 | When a health refetch fails and last-good data exists, Researcher API shows a red dot (aria-label "bad") with the text "Healthy". Database drops to "unavailable" and the last good `ready · 215ms` is discarded, not marked stale. Expected: "unavailable", or last-good marked stale. Reached by a failed refetch on Approvals to Overview remount. | `ov11-stale-1440.png`, which I viewed, and `ov11-stale-1440.txt` | `AdminOverview.tsx:263-268` and `:163-164` |
| T6-05a-04 | note | 1440, 820, 390 | With no enrichment jobs, the row reads "no runs" with state `ok` (green). GitHub sync and Link checker with no runs are `unknown`. This is arguably fine for an idle queue, but it is inconsistent against the row's "no fake zero-as-healthy" rule. It needs an owner decision. | `ov10-states-*.png` | `AdminOverview.tsx:~296` |

## Row matrix

| Row | Verdict | Widths | What I saw (all text files and screenshots are in the L05a folder) |
|---|---|---|---|
| OV-04 | PASS | 1440, 820, 390 | Populated: card shows 16 and "oldest 63d", matching the API's 16 pending with oldest `2026-08-26T05:49Z` (62.57 days, rounds to 63) at all widths. Zero-pending (patched to 0): card shows "0 nothing waiting", opens `#approvals`, and the table reads "No pending submissions." with Approve all disabled. Files: `ov04-zero-*.png`, `ov04-zero-approvals-*.png`. At 390 the card is below the fold, so I used a tall viewport. |
| OV-05 | PASS | 1440, 820, 390 | Four sources failing at once (categories, subcategories, users, pending-resources) gives a banner naming all four. Last-good values stay and the tiles read "unavailable". One Retry reissued all four requests, including users page 2, and every tile recovered. Mid-session stats plus pending failure on the 30s poll keeps the tile values and names "dashboard totals, pending approvals"; Retry restored them (820 and 390 driven this session, 1440 from L05). At 390 the poll recovered before my Retry click, so Retry-after-mid-session was driven at 820 only. A cold-load stats failure replacing the dashboard is expected per FAMILY-RULES. Files: `ov05-total-*`, `ov05-mid-*`. |
| OV-06 | PASS | 1440, 820, 390 | "Loading activity…" held for 4s while `audit-logs?limit=6&offset=0` was hung. Files: `ov06-loading-*.png`. |
| OV-07 | PASS | 1440, 820, 390 | The 500 gives "Couldn't load recent activity" with a server-error message and a Retry. It is not shown as "No audit activity". Retry reissued `GET /api/admin/audit-logs?limit=6&offset=0` and the list returned. Files: `ov07-fail-*.png`, `ov07-after-*.txt`. |
| OV-08 | PASS | 1440, 820, 390 | An empty `logs` array shows "No audit activity recorded." Files: `ov08-empty-*.png`. |
| OV-09 | PASS | 1440, 820, 390 | Six rows. At 390, TX#27628 to 27623 match the API IDs exactly, and notes and actions match. The email is masked (`a•••@example.com` for `admin@example.com`) and the age matches the timestamps. At 1440 and 820 the IDs matched the API snapshots taken at that time. `audit6.json`, `audit6-b.json`, `ov-text-*.txt`. |
| OV-10 | PASS | 1440, 820, 390 | Live rows match the sources: Database `ready · 154ms` from `lastProbe.durationMs`; GitHub "Completed · 99d" from the latest completed history item on 2026-07-20; Link checker "84d, 12 broken" from job 8 completed on 2026-08-05; Enrichment "cancelled · 39h" from job 34; Researcher API healthy. Synthetic states: Database degraded gives "degraded · timeout" (bad); empty GitHub, link and enrichment give "no runs" or "no completed runs"; AI unavailable gives "Unavailable" (bad). All three widths gave identical output. See T6-05a-04. Files: `ops.json`, `gh.json`, `lh.json`, `enr.json`, `ov10-states-*.png`. |
| OV-11 | FAIL | 1440, 820, 390 | Cold-load total failure of all 7 sources: every row says "unavailable" and there is one Retry. It reissued all 7 requests at all three widths. Partial failure (operations and link-health status): the two rows say "unavailable" and the rest are intact. Retry reissued exactly those two requests. FAIL: the stale-data behaviour, T6-05a-03. Files: `ov11-all*`, `ov11-part*`, `ov11-stale-1440.png`. |
| OV-12 | PASS | 1440, 820, 390 | "Loading categories…" held while `/api/categories` was hung. Files: `ov06-loading-*.png`. |
| OV-13 | PASS | 1440, 820, 390 | The 500 gives "Couldn't load top categories" and a Retry, not "No categories". Retry reissued `GET /api/categories` and the list returned. See T6-05a-01 for the banner side effect. Files: `ov07-fail-*.png`, `ov07-after-*.txt`. |
| OV-14 | FAIL | 1440, 820, 390 | The empty array gives the exact text "No categories have approved resources." at all three widths. FAIL on the zero-count variant, T6-05a-02. Files: `ov08-empty-*.png`. |
| OV-15 | PASS | 1440, 820, 390 | Five rows. The order and counts (704, 580, 514, 467, 447) match `/api/categories` sorted by count descending then name; the sixth entry (353) is not rendered. Files: `ov-text-*.txt`, `categories.json`. |

## Tool notes (not product defects)
- Pointer clicks on below-fold buttons silently miss in agent-browser headless. The same click worked with a tall viewport or a DOM click, which I used as the second method. This hit the Retry buttons at 820 and 390.
- After an `eval` of `route`, the browser once went offline (ERR_INTERNET_DISCONNECTED). `set offline off` fixed it. This was my session and not production.
- Another lane's QA categories ("[QA-audit-1026] Café Ünï Ætest w390", "…Cancel390x") appear in the Overview counts and the audit feed (9 became 11 categories). That is why the activity feed changed during my run.

## Not driven or caveats
- Target-size measurement for the Retry and card buttons at 390 was not done. At 820 the Retry button measured 91x44.
- The health "bad" state from a failed enrichment job (`status: failed`) was read from the code only. The cancelled warn state is live.
- I did not view every screenshot. Files I read for PASS or FAIL claims also came from the text dumps, which I compared against the API.

## QA rows and settings
- QA rows created: none, so there was nothing to delete.
- Settings changed: none on any account. I set `umami.disabled=1` and declined analytics consent in the L05a browser only. I removed all routes and left `offline` off.
- The owner was never signed out.