# NB-023 — three parallel auth-identity contracts
Decision: /api/auth/user is canonical (200 + {user,isAuthenticated} always — the SPA boots anonymously on it). /api/auth/me (REST 401 alias) and /api/auth/status (lightweight probe) stay for compatibility but are formally deprecated.
Fix: both aliases now send `Deprecation: true` + `Link: </api/auth/user>; rel="successor-version"`.
Live probes: GET /api/auth/status → 200 + both headers; GET /api/auth/me (anon) → 401 + both headers. Client greps confirm the SPA itself only uses /api/auth/user. VERIFIED.
