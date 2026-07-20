# R4-031 — Rate limiter with documented per-instance math

**Claim: fixed (code).** (MEDIUM)

Chose option (a): lowered per-instance limits on the expensive endpoints with documented arithmetic
so the limiter actually fires. loginBurst effective ~1/60s; authLimiter 7/15min; researcher + claude/analyze
capped. In-memory MemoryStore resets on restart by design (documented). A limiter that never fires is not
a mitigation — these now do (observed firing as 429 during this session's repeated logins).
