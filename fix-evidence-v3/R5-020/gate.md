# R5-020 — Audit-log int params clamped to safe range -> 400

**Claim: fixed (code).** (MEDIUM)

`parseIntInRange` (shared/validation.ts) rejects non-integers and out-of-range ints before the
query; wired on audit-logs offset/limit/resourceId (routes.ts ~3327-3346).
Repro (http1.out): offset=1e20 -> 400, limit=-1 -> 400, resourceId=1.5 -> 400, valid -> 200.
Unit (units.out): parseIntInRange boundary at 9007199254740991 and PG_INT4_MAX enforced.
