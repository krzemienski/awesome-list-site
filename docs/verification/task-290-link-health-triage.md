# Link Health triage — August 2026

## Scope

The latest completed production scan at the start of the work (job 5) contained
70 review items: 39 broken/DNS failures and 31 suspect redirects.

## Classification of all 70 job-5 items

- **Fix — 64:** 33 genuinely dead URLs and all 31 suspect redirects were
  repointed to verified-live final, canonical, replacement, or archived URLs.
  The exact old-to-new mapping and reason for every row are recorded in
  `scripts/fix-dead-links-task290-prod.ts`.
- **Fix — 2:** the FOMS Common Media Library URL needed `.html`; the dead
  Azure-hosted DASH-IF Ingest spec duplicated the existing canonical DASH-IF
  resource and was deleted. These were corrected after the verification scan
  exposed them.
- **False positive — 4:** the HHI `spie-2017.pdf` link and two Dolby
  Professional Support articles have incomplete certificate chains but return
  200 when the missing intermediate is supplied as browsers do. The
  `norsk.video/about-id3as/` link returned 200 on independent recheck. None was
  deleted or repointed.

Total classified: **66 fixes/deletes + 4 false positives = 70**.

## Duplicate-target handling

Twelve repoints initially hit the catalog's URL uniqueness guard. Eight were
given distinct live or archived destinations. Four rows were pure duplicates
of existing canonical resources (`librist`, `CloudTranscode`, `mp4ff`, and
`awesome-cmcd`) and were deleted through the admin API, preserving the
repository's audit/FK cleanup behavior.

## Verification

Production Link Health job 8 completed over all 3,823 approved resources:

- 3,809 healthy
- 12 broken
- 2 suspect
- 0 timeouts

That fresh scan cleared **56 of the original 70 flags**. Its remaining list
consisted of:

- six confirmed incomplete-certificate-chain false positives;
- the two job-5 rows noted above;
- six newly surfaced dead URLs that were not in job 5; and
- one replacement URL with a second redirect hop plus one newly surfaced
  suspect redirect.

The eight actionable job-8 findings were then corrected: seven repoints and
one duplicate deletion. The final seven target URLs were checked with the
application's own `checkResourceLinks` plus `browserVerifyLink` pipeline; all
seven returned 200, had no suspicion, and were classified alive. The duplicate
row is absent and its canonical owner remains.

Artifacts from the production API writes, job-8 output, curl checks, and
targeted application-checker validation are stored under `evidence/task290/`
(ignored from source control).

## Operational note

Jobs 6 and 7 were interrupted by unrelated production server restarts. Job 8
ran without interruption and completed in 77 minutes. A full scan is not
restart-resilient; its in-memory worker is intentionally marked failed when the
server restarts.