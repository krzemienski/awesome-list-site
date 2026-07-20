# R-14 — www.awesome.video NXDOMAIN + HSTS includeSubDomains (LOW, relates BUG-048)

**Date:** July 20, 2026 · **Status:** PLATFORM/DNS (documented, user action required) · **Re-verified live**

## Repro (fresh transcript, `transcript.txt`)

```
$ getent hosts www.awesome.video
(no record — NXDOMAIN)

$ curl -sI https://awesome.video/ | grep -i strict-transport
strict-transport-security: max-age=63072000; includeSubDomains
```

## Why this is not app-fixable

1. **`www` DNS record** must be created at the domain registrar (CNAME/A to the
   Replit deployment) and the `www` host added to the deployment's custom
   domains so the edge can terminate TLS for it. Neither step is reachable
   from application code or from this environment. This is the same user
   action recorded as outstanding in Run21 (R4-029): add the `www` record at
   the registrar, or explicitly decline www support.
2. **HSTS header** is injected by the deployment edge (the app's own header
   middleware does not set Strict-Transport-Security; the value
   `max-age=63072000; includeSubDomains` matches the platform default). App
   code cannot remove `includeSubDomains` from an edge-set header.

## Acceptance mapping

Acceptance offers "www → apex 301 (curl) OR HSTS without includeSubDomains" and
concedes "Requires DNS/platform action." Until the user adds the registrar
record, neither branch is achievable from the codebase. Risk is limited: with
NXDOMAIN, browsers never reach the site via www, and the HSTS
includeSubDomains directive only pins subdomains that already resolve.

## Action available to the user

At the domain registrar: add `www` → CNAME to the Replit deployment target
(then add `www.awesome.video` as a custom domain on the deployment), or decline.

## Resolution — CLOSED AS BY-DESIGN (July 20, 2026)

The owner was asked directly (Task: add www DNS record) and explicitly chose
"Skip www support — close this as by-design." No `www` record will be added at
the registrar. The apex `https://awesome.video` remains the sole canonical host
(verified live 200 on July 20, 2026; www remains NXDOMAIN, so browsers never
reach the site via www and no user-facing breakage occurs beyond the absent
subdomain). Finding R-14 (and its Run21 predecessor R4-029) is closed.
