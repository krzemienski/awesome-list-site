# NB-026 — no default rate-limit on most public endpoints
Fix: apiBackstopLimiter — `app.use('/api', rateLimit(300/min/IP, standardHeaders))` registered before all API routes in registerRoutes. Surface-specific limiters keep layering (stricter headers win, both count).
Live probes: /api/journeys → RateLimit-Policy: 300;w=60 + RateLimit-Limit: 300 (previously NO limiter); /api/categories → same; /api/claude/analyze shows the stricter aiLimiter policy (10;w=900) — layering confirmed.
Known gap (documented): /api/login and /api/callback are registered inside setupAuth() BEFORE this backstop, so OIDC redirect endpoints are not covered by it (they are session-write + edge-fronted; acceptable). 300/min chosen: a page load issues ~5 API calls. VERIFIED.
