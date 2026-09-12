# Evidence — disposable admin identity is created and removed by the run

## Latest clean full baseline

Run `2026-09-12T21-32-31-677Z-10218` (started 2026-09-12 21:32:31 UTC,
finished 2026-09-12 22:46:23 UTC). The run used admin identity mode and
recorded equal workspace fingerprints with `inputsChangedDuringRun: false`.

```json
{
  "mode": "admin",
  "reason": null,
  "bridgeId": "2019696328",
  "displayName": "Nick",
  "clerkUserId": "user_3JFF9bgeEVrlY84XQh9IsOizCgL",
  "teardown": {
    "keepUser": false,
    "bridgeId": "2019696328",
    "email": "__qa_test_parity_mtywihjlcc325a+clerk_test@example.com",
    "localDeleted": true,
    "clerkDeleted": true,
    "errors": [],
    "verification": {
      "localQaUsersRemaining": []
    }
  },
  "teardownError": null,
  "prefix": "__qa_test_parity_"
}
```

This is runner-level cleanup evidence: the local row and Clerk user were
deleted, no teardown errors were recorded, and the final local QA-user
verification was empty. The run still exits 1 because parity rows fail; that
exit is unrelated to identity teardown.

## Historical seventh baseline

Run `2026-09-12T16-03-20-100Z-278` (the earlier committed baseline).

## `users` table before and after

```sql
select count(*)::int as total,
       count(*) filter (where email like '__qa_test_%')::int as qa
from users;
```

| when | result |
|---|---|
| 2026-09-12 16:02 UTC, before the runner started (after `--sweep` had removed the identity orphaned by the workspace restart) | `{"total":7,"qa":0}` |
| 2026-09-12 17:13 UTC, after the runner exited | `{"total":7,"qa":0}` |

## `identity` block of `results.json`

```json
{
  "mode": "admin",
  "reason": null,
  "bridgeId": "2061939781",
  "displayName": "Nick",
  "teardown": {
    "keepUser": false,
    "bridgeId": "2061939781",
    "email": "__qa_test_parity_mtykr5qia0b9ce+clerk_test@example.com",
    "localDeleted": true,
    "clerkDeleted": true,
    "errors": [],
    "verification": {
      "localQaUsersRemaining": []
    }
  },
  "teardownError": null,
  "prefix": "__qa_test_parity_"
}
```

The Clerk user id is recorded in `results.json` (`identity.clerkUserId`) and
was deleted through the Clerk backend API (`clerkDeleted: true`); the local row
(`bridgeId`, promoted to admin through the audit-key endpoint) was deleted
through the admin API and the sweep query found no `__qa_test_parity_` rows
left (`verification.localQaUsersRemaining: []`).
