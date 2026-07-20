# R5-059 — Telemetry dead-link content validated

**Claim: fixed (code).** (LOW)

Telemetry path validated (≤200 chars, app-route shape, markup stripped) and referrer forced
same-origin-or-null before accept.
Repro (http1.out): valid telemetry -> 204; garbage path -> 400.
