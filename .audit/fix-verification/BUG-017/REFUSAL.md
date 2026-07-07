# BUG-017 — REFUSAL

**Bug:** GAESA cookie lacks `__Host-` prefix and is set at path `/` for the entire site.
**Decision:** REFUSE — the application has no code path that sets the GAESA cookie (same root cause as BUG-016).

## Evidence

Same evidence as BUG-016:
- `grep -rn "GAESA" server/ shared/ client/` returns zero application matches.
- GAESA arrives on the response from `https://awesome.video/` (`.audit/fix-baseline/probes/home-headers.txt`) — emitted by the upstream Google Frontend CDN, not by the Express app.
- The application's only cookie configuration (`server/replitAuth.ts` `getSession()`) is for `connect.sid`, not for GAESA.

## Why the application cannot fix this

The `__Host-` prefix is a browser-enforced variant that requires the cookie issuer to NOT set a `Domain=` attribute, to set `Secure`, and to use `Path=/`. These requirements apply to the **issuer of the Set-Cookie header** — here that issuer is the Google Frontend CDN, not the application.

The application cannot:
1. Rename a cookie it did not set. The `Set-Cookie` header for GAESA is emitted by the CDN.
2. Strip or prefix the cookie on egress because the CDN injects it AFTER the app's response leaves Express.
3. Add a competing `__Host-GAESA` cookie from the app, because that would result in `__Host-GAESA` AND `GAESA` both being set — `GAESA` (from the CDN) would still be present, still leak to JS, and still lack the `__Host-` prefix.

## Recommended manual follow-up

Same as BUG-016: ask the hosting operator to either harden the cookie's attributes on the CDN or disable GAESA on the deployment.

## Status

`UNFIXED — REFUSED` (cookie issued by upstream CDN; cannot be renamed or prefixed from app code).