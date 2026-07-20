# NB-025 — OpenAPI spec existed but was never mounted
Fix: GET /api/openapi.json serves swaggerSpec (server/openapi.ts); GET /api/docs serves a CSP-safe, server-rendered HTML index (0 external scripts, inline <style> only, noindex) generated from spec paths, linking the JSON spec.
Live probes: /api/openapi.json → 200 application/json, paths [/api/public/resources, /api/public/resources/{id}, /api/public/categories, /api/public/tags]; /api/docs → 200 text/html, `grep -c "script src"` = 0, h1 "Awesome List Site - Public API". docs/API.md's /api/docs reference no longer 404s. VERIFIED.
