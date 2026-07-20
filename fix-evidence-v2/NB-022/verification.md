# NB-022 — /api/claude/analyze: unmetered paid endpoint + caller errors as 500
Fix: aiLimiter attached (10 req/15min/IP, shared with other AI surfaces); URL validated (missing/non-string → 400, unparseable → 400, non-http(s) scheme → 400); upstream null result → 502 (was 500).
Live probes: anon → 401; authed `{}` → 400 "URL is required"; authed "not a url" → 400 "URL must be a valid absolute http(s) URL"; authed ftp:// → 400 with RateLimit-Policy: 10;w=900 + RateLimit-Limit: 10 headers present.
502 path not live-probed (would burn a real paid Claude call on a forced failure); code path is `if (!analysis) return 502` directly replacing the old 500. VERIFIED (limiter + 4xx live; 502 by code inspection).
