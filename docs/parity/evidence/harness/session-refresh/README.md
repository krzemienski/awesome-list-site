# Evidence — session snapshot before a wait, and the row budget baseline

Two capture-path defects that only appear when a row has to wait several
minutes for the app's AI limiter window (`POST /api/recommendations`,
10 hits / 15 min / IP, a signed-in home load consumes 2).

The original diagnostics (`diagnostics/app.shell.palette-768-actual.{png,json}`
of the 12:27 UTC run, and the raw runner logs) were lost when the workspace
restarted on 2026-09-12 at 16:00 UTC and wiped `/tmp`, where they had been
staged. The files here are reconstructed from the runner output that was read
and recorded in the task worklog before the restart; every number below was
copied from those logs verbatim, none was re-measured.

## Defect G — session snapshot taken before the wait (`before-fix.json`)

Full runs 10:44 UTC and 12:27 UTC: `app.shell.palette @ 768` recorded a
limiter wait of 569 s and then failed with
`session lapsed before capture (/api/auth/user reported a visitor)`; its
diagnostics screenshot showed the signed-out header ("Sign in"). Every other
row that merely waited through a *deferral* was fine. `openSide` had taken
`identity.storageState()` (fresh ~60 s Clerk token) before `awaitThrottleBudget`
slept; under the frozen clock ClerkJS never refreshed it. Fix: wait first,
snapshot last.

## Defect H — row budget baseline taken after the row started (`budget-before-fix.{json,txt}`)

Full run 13:38 UTC: with the reorder above, `app.shell.palette @ 768` measured
(28.49 %) after its wait, but `@ 1024` and `@ 1440` failed
`exceeded the 150s row budget` immediately after recording waits of 660 s and
510 s that the budget is meant to exclude. `withTimeout` received the running
promise and only then read the wait ledger as its baseline; the synchronous
push made by the (now first) wait was already inside it. Fix: `withTimeout`
takes a thunk and reads the baseline before starting the row.

## Rehearsal of the fixed path (`wait-path-rehearsal.{json,txt}`)

`node tests/parity/runner.mjs --only app.home.index,app.shell.palette`
(14:46 UTC): eight consumer loads against a ten-hit window. `app.home.index @ 375`
hit a 429 left over from the previous run (7 s wait, reopened once, measured
40.6085 % — identical to the full runs), then `app.shell.palette @ 768` waited
475 s in-row (no other row could go first) and was measured at 28.3214 %
with no budget timeout and no session lapse. The disposable admin was torn
down (`localQaUsersRemaining: []`).
