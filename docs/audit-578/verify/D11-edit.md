# D11 (edit half) — Edit approve/reject validate the reason type and length

**Status: FIXED — proven on DEV, 2026-10-09 (run `__qa_test_plan_582_1791561997330`)**

## Before
Per the audit: non-string rejection reasons (number, object, array) reached string code in edit moderation and could
crash with a 500 or store a non-string reason.

## Fix (`server/routes/domains/admin-content.ts`, edit approve/reject handlers only)
- `POST /api/admin/resource-edits/:id/reject` requires `reason` to be a string; trimmed length 10–2000. Otherwise
  **400** `Rejection reason must be a string of 10 to 2000 characters`, `field:"reason"`.
- `POST /api/admin/resource-edits/:id/approve` accepts an optional `reason`. If present it must be a string of at most
  2000 characters, otherwise **400** `field:"reason"`. A valid reason is recorded in the audit row.

## Proof (admin = throwaway Clerk admin; edits 76/77 on QA resource 188650)
`evidence-582/api-proof.json`:

| Request | Result |
|---|---|
| reject, no body | **400** `Rejection reason must be a string of 10 to 2000 characters` |
| reject `reason: 12345` / `{}` / `["x"]` / `null` | **400** same |
| reject `reason: "short"` | **400** same |
| reject `reason`: 2001 chars | **400** same |
| reject body literal `null` | **400** `Invalid JSON payload` |
| approve `reason: 42` / `{a:1}` / 2001 chars | **400** `reason must be a string of at most 2000 characters` |
| edit 76 after all malformed requests | still `pending`; only 1 audit row (`edit_suggested`) |
| reject 76 with `"Duplicate of existing description, please add new information."` | **200** `Edit rejected successfully` |
| approve 77 with `"Verified against the source page."` | **200** `Edit approved and merged successfully` |

No 500 appeared (`evidence-582/workflow-api-run-ai-grep.txt`: 0 HTTP 500 lines).

Audit rows (`resource_audit_log` for resource 188650):

```
edit_suggested  by _submitter  changes.proposedChanges.description {old,new}
edit_rejected   by _admin      changes.reason = "Duplicate of existing description, please add new information."
                               notes = "Edit #76 rejected: Duplicate of existing description, please add new information."
edit_suggested  by _submitter
edit_approved   by _admin      changes.reason = "Verified against the source page."  changes.changes.description {old,new}
                               notes = "Edit #77 approved and merged: Verified against the source page."
```

`resource_edits`: 76 `rejected`, rejection_reason the string above, handled_by `_admin`; 77 `approved`, handled_by `_admin`.

The admin UI reject dialog already enforces the same minimum (`MIN_REJECTION_REASON_LENGTH`) client-side. The server
check is the authority.

## Cleanup (all task-582 fixtures) — 2026-10-09 16:24–16:27 UTC
Script `evidence-582/scripts-cleanup.mjs`; output `cleanup-clerk.json`, `cleanup-db.json`.
1. Clerk-first: DELETE the three throwaway Clerk users (`_submitter`, `_second`, `_admin`). All three ok.
2. Waited 95 s (avoids JIT re-provisioning), then one DB transaction by exact id:
   - `resource_edits`: 15 rows
   - `resource_audit_log`: 23 rows
   - the 8 fixture resources 188644–188651 (removed via the `approved_by` FK sweep, then the `resources` step found 0 left)
   - 3 `users` rows
   Every other FK child table: 0 rows.
3. Collateral check: approved resources 1,824 → 1,816 (exactly the 8 fixtures); real resource #185662 is still present;
   pending edits = 0.

Residue SQL (prefix `__qa_test_plan_582_`), result **all 0**:

```sql
SELECT (SELECT count(*) FROM users WHERE id LIKE '__qa_test_plan_582_%' OR email LIKE '__qa_test_plan_582_%') users,
       (SELECT count(*) FROM resources WHERE title LIKE '__qa_test_plan_582_%' OR url LIKE '%__qa_test_plan_582_%') resources,
       (SELECT count(*) FROM resource_edits WHERE resource_id = ANY('{188644,…,188651}') OR submitted_by LIKE '__qa_test_plan_582_%'
                                            OR proposed_data::text LIKE '%__qa_test_plan_582_%') resource_edits,
       (SELECT count(*) FROM resource_audit_log WHERE resource_id = ANY('{188644,…,188651}') OR performed_by LIKE '__qa_test_plan_582_%') audit_rows;
-- {"users":0,"resources":0,"resource_edits":0,"audit_rows":0}
```

## Gates
- `npm run check`: pass.
- `npx vitest run tests/integration/api/resources.test.ts -t "edits" --no-file-parallelism`: 14 passed.
- awesome-ds-verify `--mode full`:
  - Run `2026-10-09T16-20-13-770Z-1584` (routes `/resource/188651,/resource/185662`): 15 pass, 1 FIX. `ds-button-sweep
    admin-edits` failed because it expects `button-refresh-pending-edits`, which only renders when the queue is
    **empty**, and the task fixtures had filled it.
  - Run `2026-10-09T16-29-33-760Z-3791` after cleanup (routes `/resource/185662,/`): `admin-edits` **passed**, along with
    every other check (278/279). The single FIX was `overlay-authed-delete-collection-confirm` (collections page; not
    touched by this task). That same check passed in the first run, so it is an environmental flake.
  - A scoped `--only ds-button-sweep` re-run failed earlier, at Clerk UI sign-in ("did not produce an authenticated
    session"), before reaching any route. That is environmental and not a DS finding.
  - Result: every gate and sweep check passed in at least one full run. `parity-systems` and `pixel-parity` are deep-tier
    gates and were not run (UNVERIFIED).
