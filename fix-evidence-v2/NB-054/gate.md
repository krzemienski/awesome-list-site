# NB-054 — approved_at null on ~all approved rows (VG-gate)

1,797 approved resources (dev) had `approved_at IS NULL` — bulk imports created rows already-approved without stamping the field. New admin endpoint `POST /api/admin/maintenance/backfill-approved-at` sets `approved_at := created_at` (the import moment IS the approval moment), audit-logged, anon → 401.

Proof (dev, July 20 2026):
- Run 1: `{backfilled: 1797, remainingNull: 0}`; run 2: `{backfilled: 0, remainingNull: 0}` (idempotent).
- DB: `count(*) WHERE status='approved' AND approved_at IS NULL` = 0.

**PASS.** Prod: script calls the endpoint post-republish.
