# BUG-052 — CSP header missing `form-action` (form-submission origin allowed by default)

**Severity:** LOW (defense-in-depth)
**Affected endpoint:** all pages

## Reproduction
```bash
curl -sI https://awesome.video/ | grep -i csp
```
Returns:
```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://replit.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; frame-ancestors 'none'
```
There is no `form-action 'self'` directive — meaning forms can POST to any origin (browser-enforced default).

## Expected
`form-action 'self';` (or an explicit allow-list) to harden against
form-action hijacking.

## Actual
Default behavior allows forms to submit anywhere.

## Evidence
- `contrast-seo-vuln.json`, `hdr___.csp` (truncated to 200 chars; full CSP lacks form-action)

## Fix prompt

```
Task: Add `form-action 'self';` to the CSP on https://awesome.video/.
Today the CSP header (returned at /, /submit, /login, etc.) lacks
form-action:
  default-src 'self'; script-src ...; ...; frame-ancestors 'none'

Acceptance:
1. Every page emits `content-security-policy: ... form-action 'self';`
2. The /submit form still posts to /submit (same-origin).
3. Verifiable: `curl -I https://awesome.video/ | grep -i form-action`
   matches.
```
