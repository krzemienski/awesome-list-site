# Parity 547 corrected edit + bulk proof

App base: `http://127.0.0.1:5000`. Auth used the existing `tests/parity/identity.mjs` `createDisposableAdmin({ browser, appBase, secretKey, auditKey })` flow: direct Clerk UI sign-in, OTP/client-trust handling, local JIT bridge, audit-key promotion, and teardown. No platform handshake helper, shared QA admin, shell edits, or paid jobs.

## Corrected edit approval

- Owned disposable admin bridge: `2001233521` (deleted before teardown; no secret recorded).
- Edit `59`, resource `188325`.
- Exact resource timestamp passed as `original_resource_updated_at`: `2026-09-13T07:59:23.054Z`.
- Exact schema-correct change: `{title:{old:"__qa_test_parity547_edit-approve-resource",new:"__qa_test_parity547_edit-approve-resource-new"}}`.
- Real Edits UI approval completed with `Edit Approved — The changes have been applied to the resource.`
- DB proof: edit status `approved`, `handled_at` populated; resource title became `__qa_test_parity547_edit-approve-resource-new`, status remained `approved`, and resource `updated_at` matched the handling time.

## Corrected edit rejection

- Separate owned disposable admin identity was created and fully torn down.
- Edit `61`, resource fixture `__qa_test_parity547_reject_resource`.
- Exact timestamp: `2026-09-13T07:59:45.557Z`.
- Exact change shape: `{title:{old:"__qa_test_parity547_reject_resource",new:"__qa_test_parity547_reject_resource-new"}}`.
- Real reject dialog used `input-rejection-reason`; after filling `Parity 547 corrected rejection reason`, the confirm button was enabled.
- Real endpoint response: HTTP 200, `{message:"Edit rejected successfully"}`.
- UI toast: `Edit Rejected — The edit suggestion has been rejected.`
- DB proof: status `rejected`, exact rejection reason persisted, `handled_at` populated.

## Bulk outcomes and nonpending skips

Using the authenticated page’s credentialed `fetch` against the real admin endpoints:

- Bulk approve request IDs: pending `188327`, pending `188328`, and nonpending approved `188325`.
- Response: HTTP 200, `Approved 2 resource(s)`, `{succeeded:2, failed:1}`.
- Bulk reject request IDs: pending `188329` and nonpending approved `188326`.
- Response: HTTP 200, `Rejected 1 resource(s)`, `{succeeded:1, failed:1}`.
- Persisted statuses: 188327/188328 approved, 188329 rejected, and the nonpending rows remained approved. The failed counts therefore prove nonpending skip/failure handling without mutating nonpending records.

## Cleanup

All exact parity-547 resource/edit fixtures were deleted before each identity teardown. The helper teardown then deleted the local admin bridge and Clerk identity and verified zero remaining parity local users. No paid research/enrichment job was launched.

Raw JSON: `corrected-edit-bulk-proof.json` and `corrected-edit-rejection-proof.json`.
