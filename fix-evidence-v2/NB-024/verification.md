# NB-024 — /api/admin/users: unvalidated pagination
Fix: parseBoundedInt on page/limit (shared validator, same as public surfaces), limit capped at 100.
Live probes (authed admin): page=-1 → 400 "page must be a positive integer" (was 500 via negative OFFSET); limit=-1 → 400 (was: PG LIMIT -1 → full dump); limit=1e9 → 400; limit=101 → 200 with cap applied; page=2&limit=5 → 200, 1 user (6 total — honest paging). VERIFIED.
