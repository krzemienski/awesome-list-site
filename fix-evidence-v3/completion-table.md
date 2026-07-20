# Run24A (Task #180) — completion table

Claims vocabulary: `fixed (code)` · `fixed-data (journal)` · `platform` · `declined` · `invalid`.

| ID | Sev | Claim | Summary | Evidence |
|---|---|---|---|---|
| R4-016 | HIGH | fixed (code) | Edit endpoints apply the shared URL validator | fix-evidence-v3/R4-016/gate.md |
| BUG-049 | MEDIUM | fixed (code) | Admin edit enforces shared validators server-side | fix-evidence-v3/BUG-049/gate.md |
| R5-019 | HIGH | fixed (code) | Control chars / NUL byte rejected with 400 (was 500) | fix-evidence-v3/R5-019/gate.md |
| R5-020 | MEDIUM | fixed (code) | Audit-log int params clamped to safe range -> 400 | fix-evidence-v3/R5-020/gate.md |
| R5-021 | MEDIUM | fixed (code) | researcher/start zod-strict input validation | fix-evidence-v3/R5-021/gate.md |
| R5-031 | LOW | fixed (code) | NFKC-fold + strip Cf before common-password denylist | fix-evidence-v3/R5-031/gate.md |
| R5-038 | HIGH | fixed (code) | Bidi-override / Cf-only strings rejected | fix-evidence-v3/R5-038/gate.md |
| R5-046 | LOW | fixed (code) | Passwords capped at 72 BYTES (bcrypt truncation) | fix-evidence-v3/R5-046/gate.md |
| R5-047 | MEDIUM | fixed (code) | Oversized body -> 413, malformed JSON -> 400 | fix-evidence-v3/R5-047/gate.md |
| R5-048 | MEDIUM | fixed (code) | URL canonicalization at persist time | fix-evidence-v3/R5-048/gate.md |
| R5-059 | LOW | fixed (code) | Telemetry dead-link content validated | fix-evidence-v3/R5-059/gate.md |
| R5-028 | HIGH | fixed (code) | Password change invalidates other sessions | fix-evidence-v3/R5-028/gate.md |
| R5-029 | MEDIUM | fixed (code) | PII exports are audit-logged | fix-evidence-v3/R5-029/gate.md |
| R5-030 | HIGH | fixed (code) | /api/claude/analyze gated + fetch errors -> 4xx | fix-evidence-v3/R5-030/gate.md |
| R5-045 | MEDIUM | fixed (code) | check-url returns only {exists} | fix-evidence-v3/R5-045/gate.md |
| R5-060 | HIGH | fixed (code) | Auth guard before method dispatch | fix-evidence-v3/R5-060/gate.md |
| NB-007 | HIGH | fixed (code) | Real per-skill-level recommendation weighting | fix-evidence-v3/NB-007/gate.md |
| R4-031 | MEDIUM | fixed (code) | Rate limiter with documented per-instance math | fix-evidence-v3/R4-031/gate.md |

## Verification (Iron Rule)
- Unit suite: fix-evidence-v3/_harness/units.out — 28/28 PASS (R5-038, R5-020, R5-046, R5-031, NB-007).
- HTTP phase 1: fix-evidence-v3/_harness/http1.out — ALL PASS (R5-060/045/059/047/020/038/021/030/019).
- Session: fix-evidence-v3/_harness/run24a-http2b.mjs — R5-028 cross-restart two-jar, other session invalidated.
- tsc clean; migration-drift clean; QA `__qa_test%` residue torn down to net-zero.
