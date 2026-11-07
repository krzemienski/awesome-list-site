# Tier 2 production-write ledger (wave 2, lane w2-tier2)

Layout is mine. Ids only; no credentials. Credentials live in `~/.cache/awesome-audit/audit-admin.env` (chmod 600).

| Time (UTC) | Action | Undo |
|---|---|---|
| 2026-11-07 01:48Z | Created mail.tm inbox `awesome-tier2-admin-e30275@fldubai.com` (201) | external, not removed |
| 2026-11-07 01:57Z | Real Clerk sign-up on https://awesome.video/sign-up created production user `user_3Ll7BiTtwPUMFSN96bgs6ClDXYI` (role `user`, no verification step) | owner `DELETE /api/admin/users/:id` |
| 2026-11-07 01:57Z | `PATCH /api/user/profile` as that user: name "[AUDIT] Tier2 Admin" (200) | patch the name back |
| 2026-11-07 01:58Z | Promotion `PUT /api/admin/users/:id/role {"role":"admin"}` with the owner header: **401, not applied** (owner.hdr is stale: `/api/admin/stats` also 401). Lead asked to refresh it or run the call. | n/a (no change made) |

## Account ids
- Audit admin ("[AUDIT] Tier2 Admin"): `user_3Ll7BiTtwPUMFSN96bgs6ClDXYI`
- C22 member ("[AUDIT] C22 Member", from cycle-22/m0-auth.md): `user_3Lk0O4nWTo2VnwbqvnFWyoCDyPo`

## Run command (after publish and promotion)
`PROD_CHECK_AUDIT_ADMIN_ID=user_3Ll7BiTtwPUMFSN96bgs6ClDXYI PROD_CHECK_AUDIT_MEMBER_ID=user_3Lk0O4nWTo2VnwbqvnFWyoCDyPo npx tsx scripts/prod-check/index.ts --tier 2 --allow-writes`

## Gate-closed dry run (2026-11-07 02:02Z)
`--tier 2 --allow-writes` with deliberately wrong ids (`x`, `y`) signed both audit accounts in on production (Clerk sign-in only: a new session each, 0 non-GET first-party requests outside the Clerk allowlist), `T2-00` failed on the id mismatch before any write, `qa-rows` answered 403 (env not published). No rows were created. Undo: none needed (sessions are not signed out, by rule).
