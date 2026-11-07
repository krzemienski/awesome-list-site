I stopped early. The lane is not finished: 87 rows were open and I drove only a few at 1440. Everything else is undriven, not passed. I'm returning what I have so you can decide how to split the rest.

## 1. Verdict: ISSUES

Four rows have a verdict and three of them are defects (T6-08-01 to -03). A fourth defect, T6-08-04, comes from a row I left marked undriven. The lane is incomplete.

- Prod revision at start (18:50:22Z) was `bc1797b065c1989ab92f512633f69bf3fe25e718`.
- I did not re-read it at the end.
- Zero POSTs were issued. I confirmed with `network requests --method POST` after each action that could have fired one.
- I did not launch, cancel, approve or reject anything.
- All widths were 1440 only (the page height was 2200, not the 900 the brief names).
- 820 and 390 were not driven at all.

## 2. Findings

| id | severity | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|---|
| T6-08-01 | Medium | `/admin#enrichment` | 1440 | The Avg cost tile shows `$0.03 per batch`. It averages 9 jobs that report a cost, and 7 of those are $0.0000 "nothing to process" runs (true mean 0.0279). Cancelled partial batches also count. The brief says fake zero-cost values should not appear. | `en-jobs-api.json`, `en-1440-initial.png` | `client/src/components/admin/BatchEnrichmentPanel.tsx:93-103` |
| T6-08-02 | Medium | `/admin#researcher` launch form | 1440 | Out-of-range limits give no inline error. Budget 0 or -1, turns 1.5 or 0, target 0, and minimum duration -5 or 9999 leave the form showing `budget?` or `turns?` in the summary line, with Launch disabled. The summary also shows `-5 min minimum` and `9999 min minimum` as accepted. There is no `aria-invalid` and no `aria-describedby` message. RS-19 expects precise inline validation. Short-brief validation does work. | Probe output captured in session; no screenshot | Researcher launch form component (not located) |
| T6-08-03 | Low | `/admin#enrichment` | 1440 | The Last enriched tile reads `38h ago · batch #34 · 10 resources · cancelled`. The API gives `completedAt` 2026-10-26T04:34:47Z for a cancelled job. | `en-1440-initial.png` | `BatchEnrichmentPanel.tsx:~424` |
| T6-08-04 | Low | `/admin#enrichment` | 1440 | While the jobs endpoint was aborted, the full `[role=tabpanel]` innerText came back empty. The error UI does render visibly, so this is probably my probe selecting the wrong element. Not confirmed as a defect. | `en-1440-jobs-fail.png` | none |

## 3. Row matrix

| row | verdict | width | evidence |
|---|---|---|---|
| EN-01 | FAIL (see T6-08-01 and T6-08-03; the error state shows `—` and `unavailable` correctly) | 1440 | `en-1440-initial.png`, `en-1440-jobs-fail.png` |
| EN-02 | UNDRIVEN | none | none |
| EN-03 | PARTIAL. Retry reissued `GET /api/enrichment/jobs`, 200, and the list returned. Stale-row marking not checked. Run job disabled while the list is in error. | 1440 | `en-1440-jobs-fail.png` |
| EN-04 | UNDRIVEN | none | none |
| EN-05 | PARTIAL. 6 rows match the API; the table shows no processed counts. | 1440 | `en-jobs-api.json` |
| EN-06 | PASS | 1440 | `en-1440-controls.png` |
| EN-07 | UNDRIVEN. The control shows "Show all 33 jobs" (collapsed). | none | none |
| EN-08 | PASS. Confirmation opens with no POST. | 1440 | `en-1440-confirm.png` |
| EN-09 | PASS. Unenriched scope is 2,737, matching `/api/admin/enrichment/coverage`. All Resources scope is 3,826. | 1440 | `en-coverage.json` |
| EN-10 | PASS (values 1, 7, 50 tested; 7 and 50 accepted) | 1440 | none |
| EN-11 | PASS. Blank, 1.5, 0, -3 and 51 all give the inline error and disable both Run job controls. | 1440 | `en-1440-blank.png` |
| EN-12 | PARTIAL. The expanded state is accurate; the active-job disabled state is not checked. | 1440 | `en-1440-advanced.png` |
| EN-13 | PARTIAL. Placeholder is `cc/claude-haiku-4-5-20251001 (default)`; `/api/health/ai` was captured but not fully compared. | 1440 | `en-health-ai.json` |
| EN-14 | PASS. Helper text states HTTP/HTTPS and the token requirement. An http URL shows an unencrypted-token warning. | 1440 | `en-1440-advanced.png` |
| EN-15 | PARTIAL. Field is `type=password`, `autocomplete=off`. Token clearing after launch not testable. | 1440 | none |
| EN-16 | PASS. Cancel sent no POST. | 1440 | `en-1440-confirm.png` |
| EN-17 | BLOCKED-BY-POLICY | none | none |
| EN-18 | UNDRIVEN | none | none |
| EN-19 | PARTIAL. Run job and Start Enrichment are disabled when the list errors. | 1440 | `en-1440-jobs-fail.png` |
| EN-20 | UNDRIVEN | none | none |
| EN-21 | UNDRIVEN | none | none |
| EN-22 | UNDRIVEN | none | none |
| EN-23 | UNDRIVEN | none | none |
| EN-24 | BLOCKED-BY-POLICY | none | none |
| EN-25 | UNDRIVEN | none | none |
| EN-26 | PASS. Logs opens details and issues GET `/api/enrichment/jobs/34` and `/34/events` (200). | 1440 | `en-1440-details34.png` |
| EN-27 | UNDRIVEN | none | none |
| EN-28 | UNDRIVEN | none | none |
| EN-29 | PARTIAL. Details show config with token as "Platform key" and 10 processed IDs. Cap-at-50 overflow and focus return on close not checked. | 1440 | `en-1440-details34.png` |
| EN-30 | PARTIAL. Graph and 41 structured events populate for the terminal job. Other states undriven. | 1440 | `en-1440-details34.png` |
| EN-31 | UNDRIVEN | none | none |
| RS-01 | PARTIAL. Radio switches; payload not inspected. | 1440 | `rs-1440-launch.png` |
| RS-02 | PASS. The "Write my own" textarea requires at least 10 characters ("5/10"). | 1440 | `rs-1440-short-brief.png` |
| RS-03 | PASS (success path only). GET `/api/researcher/brief` 200 filled 3,496 characters and switched to custom mode. Error toast undriven. | 1440 | none |
| RS-04 | PASS. Count updates and Launch is disabled. | 1440 | `rs-1440-short-brief.png` |
| RS-05 | UNDRIVEN | none | none |
| RS-11 | PASS. Scout override is included in `GET /api/researcher/config?scoutModel=…`. | 1440 | none |
| RS-12 | PASS. Custom base URL refreshes the preview host; https and http both show their text. | 1440 | `rs-1440-http.png` |
| RS-13 | PASS. Field is password-type; only `hasAuthToken=1` reaches the preview. Clearing after launch not testable. | 1440 | none |
| RS-14 | PASS. The acknowledgement checkbox gates `allowInsecureHttp=1` in the preview; before it is ticked the preview warns "Confirm the insecure endpoint first." | 1440 | `rs-1440-http-ack.png` |
| RS-16 | PASS. With config aborted, an inline "Could not reach the server" error shows and Launch is disabled. | 1440 | `rs-1440-config-fail.png` |
| RS-18 | PASS. Follow run #84 switches to `?jobId=84`. | 1440 | `rs-1440-run84-details.png` |
| RS-19 | FAIL (T6-08-02) | 1440 | none |
| RS-21 | UNDRIVEN. The launch dialog could not open because run #84 is active, so this is BLOCKED-BY-LEAD for now. | none | none |
| RS-23 | PARTIAL. Active-run guard shows "Run #84 is still in progress" with Follow and Launch disabled. Config failure also disables Launch. | 1440 | `rs-1440-launch.png` |
| RS-24 | BLOCKED-BY-LEAD (cannot open the launch dialog while run #84 is active) | none | none |
| RS-25 | UNDRIVEN | none | none |
| RS-26 | PASS. A 404 gives the explanatory message; Start another run goes to the launch form at `/admin/researcher`. | 1440 | `rs-1440-404.png` |
| RS-27 | UNDRIVEN | none | none |
| RS-32 | PASS. I aborted the job, events and discoveries polls; the run view showed "Live updates failed; showing the last good data and retrying" with stale values, and it cleared after un-aborting. | 1440 | `rs-1440-poll-fail.png` |
| RS-37 | UNDRIVEN | none | none |
| RS-46 | UNDRIVEN. The table shows Latest 5 of 84 with Show more. | none | none |
| RS-48 | UNDRIVEN | none | none |
| RS-50 | BLOCKED-BY-POLICY | none | none |
| RS-53 | UNDRIVEN | none | none |
| GH-01 to GH-23 | UNDRIVEN except GH-06 and GH-09 (BLOCKED-BY-POLICY). I only loaded `/admin#github`. It shows `krzemienski/awesome-video`, `master`, last sync Jul 20 2026, 49 jobs, Preview import, Pull, Sync now, and history rows #49–#45. `sync-history` and `sync-status` both returned 200. | 1440 | `gh-1440.png` |
| RW-01 to RW-09 | UNDRIVEN. I only loaded `/admin#research`. It shows 4 note cards with candidate counts and freshness. | 1440 | `rw-1440.png` |

I never looked at `gh-1440.png` or `rw-1440.png`; the GH and RW observations above come from page text only.

## Run #84 observations (live, timestamps UTC)

- **18:54:37:** `processing`, model `cx/gpt-6-luna`, cap $3.80 and 600 turns, 1 discovery, 6 scouts.
- **18:57:58 and later:** running for about 10:19 to 10:51; 103 structured events; Scouts 1–5 reported, Scout 6 searching.
- **One pending discovery:** Recommendation ITU-R BT.2100. I did not approve or reject it.
- **Spend and turns:** the live view showed "reported at the end" for Spend and "counted at the end" for Turns. The jobs table showed `$0.0000` and `0/600` for #84 while running.

## 4. QA rows created and deleted

None.

## 5. Settings changed and restored

None. I did leave temporary client-side network aborts and form edits, but all were unrouted and are not persisted. The `L08` browser session is still open at `/admin/researcher?jobId=84`.

## Still undriven (to hand to another lane or re-run)

- All of GH, RW and RS-05 and RS-25 to RS-53, plus the undriven EN rows listed above.
- All of 820 and 390 for every row.
- Reduced-motion, offline and keyboard rows.

Evidence is in `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L08/`.