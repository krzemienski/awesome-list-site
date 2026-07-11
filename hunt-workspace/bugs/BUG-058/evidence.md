# BUG-058 — /api/resources responds to cross-origin requests (CORS allowOrigin reflects)

**Severity:** MEDIUM (Cross-origin data exfiltration possible)
**Affected endpoint:** https://awesome.video/api/resources

## Reproduction
```bash
curl -sI -X GET https://awesome.video/api/resources \
  -H 'Origin: https://evil.example' | grep -i 'access-control'
```
The API allows cross-origin GETs. The allow-origin header reflects
the request's Origin. With `credentials` and an authenticated
session cookie, a malicious site could embed a request and read
the response.

## Expected
Either:
- `Access-Control-Allow-Origin: https://awesome.video` (allow-list), or
- Same-site-only cookies + no CORS = no cross-origin read.

## Actual
Reflexive allow-origin pattern is in place, and combining it with
cookie-based auth (which doesn't appear `SameSite=Strict`) enables
cross-origin data exfiltration.

## Evidence
- `quick4.json`, `corsResources` and `cors_options_*`

## Fix prompt

```
Task: /api/resources sets Access-Control-Allow-Origin reflectively. For a
read-only public API, that's fine; but if the response includes any
identifying info and the cookie isn't SameSite=Strict, an attacker
site can read it.

Acceptance:
1. Access-Control-Allow-Origin is fixed (e.g., the same as the SPA
   origin), OR
2. SameSite=Strict on the session cookie, OR
3. The route is not CORS-enabled (no Allow-Origin header in response).

Pick (2)+(3) as the safer defaults.
```
