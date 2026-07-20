# NB-019 — /api/resources pagination: non-integer & overflow forms
Fix: strict `/^-?\d+$/` + `Number.isSafeInteger` + PG int4 bound (2147483647) on offset/limit/page (server/routes.ts ~1147). In-range numerics keep the Run16 clamping contract.
Live probes (dev, July 20, 2026):
- offset=1e20 → 400 (was: parseInt read it as 1 → silent wrong page)
- offset=100000000000000000000 (written digits) → 400 (was: PG overflow → 500)
- offset=abc → 400; offset=50 → 200; offset=-5 → 200 (clamped to 0, existing contract)
- page=1000000000000000000 → 400; page=1e18 → 400; limit=1e5 → 400
- limit=200&page=2 → 200, clamped to 100 (contract preserved)
Envelope: `{ error: 'invalid_*', message: '…' }` (Run16 BUG-091 shape kept). VERIFIED.
