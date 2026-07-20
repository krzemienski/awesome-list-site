# R5-030 — /api/claude/analyze gated + fetch errors -> 4xx

**Claim: fixed (code).** (HIGH)

analyze restricts targets to an allowlist and maps unfetchable-URL errors to 4xx instead of 500.
Repro (http1.out): non-allowlisted target -> 400 (not 500).
