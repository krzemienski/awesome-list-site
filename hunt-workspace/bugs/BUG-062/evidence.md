# BUG-062 — /admin route accessible for anonymous users (HTML shell; only API/data is gated)

**Severity:** MEDIUM (data-isolation; SPA shell exposure)
**Affected page:** https://awesome.video/admin

## Reproduction
1. Open https://awesome.video/admin in a fresh anonymous chromium.
2. The page loads (HTTP 200). The HTML chrome is the standard SPA shell.
3. The body briefly shows "Loading admin dashboard…", then after a
   long delay (10 s) shows "Authentication Required" with the public
   sidebar.

```bash
curl -sIL -o /dev/null -w '%{http_code}\n' https://awesome.video/admin
# → 200 OK
```

## Expected
For anonymous visitors, the SPA either redirects immediately to /login
or returns HTTP 401 / 403. Today the SPA returns a 200 + a delayed
"Authentication Required" body — wasted client work and SEO pollution.

## Actual
Anonymous access to /admin returns 200 with the standard SPA shell and
a delayed auth-gate body. Combined with the absence of a "noindex" tag,
search engines may index the auth-required admin chrome.

## Evidence
- `verify-findings.js` and `phase2-login.js` outputs
- `screenshots/admin_no_auth_full.png` and `admin_a_loaded.png` from earlier probes

## Fix prompt

```
Task: GET https://awesome.video/admin returns HTTP 200 to anonymous
clients. The SPA shell is sent, then client-side detects the missing
session and shows "Please sign in." Reproduction:
  curl -sI https://awesome.video/admin  # today 200
  # Then after 10s the SPA body includes "Authentication Required" text.

Acceptance:
1. Server returns 302 → /login for anonymous requests to /admin/*.
2. OR returns 401 with a noindex meta and a minimal "you must log in" body.
3. Verifiable: curl -I /admin for an anon client.
```
