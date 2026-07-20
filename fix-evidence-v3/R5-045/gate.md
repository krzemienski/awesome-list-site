# R5-045 — check-url returns only {exists}

**Claim: fixed (code).** (MEDIUM)

GET /api/resources/check-url now returns `{exists: boolean}` ONLY — no id/title/category of
pending or rejected rows leaks to anon (routes.ts ~1456-1492).
Repro (http1.out): response keys are exactly ["exists"].
