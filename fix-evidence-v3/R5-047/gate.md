# R5-047 — Oversized body -> 413, malformed JSON -> 400

**Claim: fixed (code).** (MEDIUM)

body-parser `entity.too.large` and JSON parse errors are mapped in the error middleware to
413 / 400 respectively (never 500).
Repro (http1.out): 200KB body -> 413; malformed JSON -> 400.
