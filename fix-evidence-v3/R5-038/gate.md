# R5-038 — Bidi-override / Cf-only strings rejected

**Claim: fixed (code).** (HIGH)

BIDI_CONTROL_RE (`[\u202A-\u202E\u2066-\u2069\u200E\u200F]`) wired into title/description/tag/
taxonomy/displayName/journey schemas + the researcher prompt. Cf-only or bidi-containing values
no longer pass the non-empty check.
Repro (http1.out): admin PUT bidi title -> 400; submit bidi title -> 400.
Unit (units.out): bidi rejected; ZWJ-emoji sequences NOT falsely rejected (no-regression).
