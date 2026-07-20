# R5-019 — Control chars / NUL byte rejected with 400 (was 500)

**Claim: fixed (code).** (HIGH)

SINGLE_LINE_CONTROL_RE / MULTILINE_CONTROL_RE (shared/validation.ts) reject `[\u0000-\u001F\u007F]`
in titles/descriptions on every write endpoint, so the NUL byte never reaches the PG driver.
Repro (http1.out): submit NUL title -> 400 (not 500); ESC/control chars rejected the same way.
