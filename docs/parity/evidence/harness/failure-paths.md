# Focused failure-path verification

Date: 2026-09-12  
App target: `http://127.0.0.1:5000` (live local app)  
Scope: two selected rows only; no full parity or baseline run

These probes used temporary runner roots under `/tmp`. The runner's
`repoRoot`, `baseline/`, `docs/parity/evidence/`, reports, and capture files
were all inside those temporary roots, so the shared
`tests/parity/{actual,expected,diff}` mirrors and committed reports were not
written. No endpoint responses were mocked or synthesized.

## 1. Timeout cancellation and cleanup

Temporary root: `/tmp/parity-failure-probe-30790`  
The copied runner's `ROW_TIMEOUT_MS` was changed from `150000` to `1000` only
inside that temporary root. Command:

```text
BASE_URL=http://127.0.0.1:5000 node /tmp/parity-failure-probe-30790/tests/parity/runner.mjs \
  --as visitor --only app.about,app.category --width 375
```

Observed exit: **2** after 13.282 seconds.

The stderr ordering was:

```text
[parity] app.about @ 375
  ✗ app.about@375 exceeded the 1s row budget
[parity] app.category @ 375
  ✗ app.category@375 exceeded the 1s row budget
[parity] incomplete-evidence: 0/0 pixel rows pass, 0 fail, 2 incomplete, 0 blocked
```

The first terminal timeout record precedes the next row's start message; there
was no post-timeout capture/retry output interleaved with the next row. The
temporary results recorded:

```json
{
  "exitCode": 2,
  "claim": "incomplete-evidence",
  "summary": {
    "denominator": 0,
    "incomplete": 2,
    "incompleteEvidence": true
  },
  "statuses": [
    "app.about@375 INCOMPLETE",
    "app.category@375 INCOMPLETE"
  ]
}
```

The timeout run's `actual/`, `expected/`, and `diff/` directories contained no
capture files. Both live catalog hashes were present and equal at start/end,
and the end re-read reported no error. After the process exited, no Chromium
or probe processes remained. This verifies that a timed-out row is not
returned to the queue as a visual failure and that the next row does not start
until the timed-out capture has settled and its contexts have been closed.

## 2. Normal filtered capture and live adapter re-read

Temporary root: `/tmp/parity-normal-probe-31077`  
The live visitor capture:

```text
BASE_URL=http://127.0.0.1:5000 node /tmp/parity-normal-probe-31077/tests/parity/runner.mjs \
  --as visitor --only app.about --width 375
```

completed with exit **0** and status `EVIDENCE`. It produced the accepted
actual/reference/diff PNGs and both stability frame pairs. Both sides were
font-complete (`39` shared faces), had zero API failures, and stabilized on
attempts `[1,2]`. The catalog adapter was re-read while the run was still
alive:

```text
catalogStart = 97b794cb99d8e4cc434397da7626f7879080393de0a2f529efd191fb2df94b33
catalogEnd   = 97b794cb99d8e4cc434397da7626f7879080393de0a2f529efd191fb2df94b33
inputsChangedDuringRun = false
```

An additional selected admin capture exercised the disposable identity and
both live adapter re-reads:

```text
BASE_URL=http://127.0.0.1:5000 node /tmp/parity-normal-probe-31077/tests/parity/runner.mjs \
  --as admin --only app.about --width 375
```

It completed with the expected visual-diagnostic exit **1** (`FAIL`, 75.4063%
diff), not an infrastructure failure. Capture readiness remained healthy:
both sides stabilized on `[1,2]`, font parity was complete, and actual/reference
API failures were empty. The run recorded equal start/end hashes:

```text
catalogStart = 97b794cb99d8e4cc434397da7626f7879080393de0a2f529efd191fb2df94b33
catalogEnd   = 97b794cb99d8e4cc434397da7626f7879080393de0a2f529efd191fb2df94b33
adminStart   = f0e6d5445197812f2c21dffdc658681ef3c9d34164ee79653b631061076282ec
adminEnd     = f0e6d5445197812f2c21dffdc658681ef3c9d34164ee79653b631061076282ec
error        = null
inputsChangedDuringRun = false
```

Identity teardown was clean (`localDeleted: true`, `clerkDeleted: true`,
`errors: []`, `localQaUsersRemaining: []`). This proves the normal filtered
capture path, catalog/admin end re-read, and auth teardown against the live
system without claiming that the page itself is visually at parity.

## Classification review

The focused admin run confirms that a real visual mismatch remains `FAIL` with
exit 1, while the timeout run is `INCOMPLETE` with exit 2. The classifier was
also tightened to recognize nested infrastructure causes and the complete
common filesystem error family (`ENOENT`, `ENOTDIR`, `EEXIST`, `ENOSPC`,
`EACCES`, `EROFS`, and related codes), rather than allowing an unexpected
filesystem rejection to be reported as visual drift.

## Evidence boundary

The historical full baseline immediately preceding this repair is retained as
historical visual evidence only. Its equal fingerprints did not include the
new `server/` runtime hash or the new end-of-run live catalog/admin adapter
hashes. It is therefore not evidence of current server/live-data integrity;
the focused results above are the post-repair integrity checks.