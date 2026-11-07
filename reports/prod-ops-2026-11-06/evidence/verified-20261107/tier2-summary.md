# prod-check 20261107T030323Z: PASS

Base https://awesome.video, revision `9d580ddb7536`, tiers 2, started 2026-11-07T03:03:23.728Z.
pass 9, fail 0, info 0, skip 0.
Read-only guard: 0 non-GET requests to awesome.video.

| id | status | blocking | ms | detail |
|---|---|---|---|---|
| T2-00 | pass | yes | 24775 | both audit accounts signed in |
| T2-01 | pass | yes | 661 | submitted #190958, pending, listed for the member |
| T2-02 | pass | yes | 226 | #190958 is in the approvals queue |
| T2-03 | pass | yes | 1374 | #190958 rejected; hidden from the public |
| T2-04 | pass | yes | 1452 | #190959 submitted and withdrawn; second withdraw 409 |
| T2-05 | pass | yes | 1191 | bookmark on #190896 added, read back, removed |
| T2-06 | pass | yes | 1763 | #190958 edited and reverted; sync queue 49 -> 49 |
| T2-10 | pass | yes | 11157 | backup c7da09c24327; removed 2 of 2 rows |
| T2-11 | pass | yes | 805 | zero [QA-20261107T030323Z] rows left; re-read 404; none pending |
