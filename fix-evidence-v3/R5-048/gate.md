# R5-048 — URL canonicalization at persist time

**Claim: fixed (code).** (MEDIUM)

httpsUrlSchema/webUrlSchema reject backslash-host, port 0, embedded userinfo, and control chars;
IDN hosts become punycode via WHATWG URL (isPlausiblePublicUrl ASCII-host rule doubles as
punycode-or-400). `normalizeCatalogUrl` transform strips tracking params (utm_*, _hsenc,
_branch_match_id, gi, fbclid, gclid, source=userActivityShare) and re-serializes to the canonical
form at write time (shared/validation.ts ~195-239). Data-row backfill is Run24E's job.
Verified by code-read + wiring at submit/edit/admin-create.
