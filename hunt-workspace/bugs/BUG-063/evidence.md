# BUG-063 — /resource?q=<query> renders page but body says "Loading…" (SPA hydration hidden)

**Severity:** MEDIUM (UX / SEO soft-404)

This is a re-confirmation of BUG-012 with extra details. /resource?q=ffmpeg returns HTTP 404 hard status but the body is the SPA loading shell — search engines and humans see "Loading…" while browsers get a 404. Asymmetric soft-404.

(See BUG-012 for full repro; this entry is here as a separate entry to surface the soft-404 ergonomic problem specifically.)
