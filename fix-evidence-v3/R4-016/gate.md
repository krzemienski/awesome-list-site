# R4-016 — Edit endpoints apply the strict https-only URL validator

**Claim: fixed (code).** (HIGH)

Both edit paths now run the shared `httpsUrlSchema` (shared/validation.ts) on a URL *change*:
https-only, ≤2048 chars, no control chars, no backslash-host, no embedded userinfo, no port 0,
dotted public hostname, punycode-or-400 for IDN, tracking-param strip via `normalizeCatalogUrl`.
An http:// destination can no longer be introduced or kept via an edit.
Wired at: POST /api/resources/:id/edits (routes.ts ~1858), PUT /api/admin/resources/:id (~3521).
New-resource paths use the same strict `httpsUrlSchema` (submit ~1597, admin create ~3758).

Legacy http:// rows stay editable: when the submitted URL is byte-equal to the stored URL the
field is skipped entirely, so unrelated field edits on an existing http:// resource still succeed.

Repro (fix-evidence-v3/_harness/http2c.out):
- admin PUT changing url to http://example.com/x -> 400 "Must be a valid HTTPS URL".
- admin PUT changing url to https://example.com/x -> 200.
- admin PUT bidi title -> 400, resource still readable (200) (http1.out).
