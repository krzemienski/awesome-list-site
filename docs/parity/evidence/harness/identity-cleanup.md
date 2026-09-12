# Evidence — disposable admin identity is created and removed by the run

Run `2026-09-12T16-03-20-100Z-278` (the committed baseline).

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
