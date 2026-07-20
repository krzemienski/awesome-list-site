# R5-046 — Passwords capped at 72 BYTES (bcrypt truncation)

**Claim: fixed (code).** (LOW)

PASSWORD_MAX_BYTES=72 checked via utf8ByteLength (shared/validation.ts) with a clear message,
so multi-byte passwords beyond bcrypt's 72-byte limit are rejected instead of silently truncated.
Unit (units.out): 72-byte password accepted, 73-byte rejected.
