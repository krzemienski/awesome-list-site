# R4-016 — Edit endpoints apply the shared URL validator

**Claim: fixed (code).** (HIGH)

Edit paths now run the shared `webUrlSchema` (shared/validation.ts): legacy `http://` is
kept by design for existing catalog rows, but the same caps/hardening apply — ≤2048 chars,
no control chars, no backslash-host, no embedded userinfo, no port 0, dotted public hostname,
punycode-or-400 for IDN, tracking-param strip via `normalizeCatalogUrl` transform.
Wired at: POST /api/resources/:id/edits (routes.ts ~1854), PUT /api/admin/resources/:id (~3518).
New-resource paths use the stricter `httpsUrlSchema` (submit ~1597, admin create ~3758).
Repro (fix-evidence-v3/_harness/http1.out): admin PUT bidi title -> 400, resource still readable (200).
