# BUG-053 — CSP missing `base-uri 'self'` and `object-src 'none'` (defense-in-depth)

**Severity:** LOW (defense-in-depth)
**Affected endpoint:** all pages

## Reproduction
```bash
curl -sI https://awesome.video/ | grep -i csp
```
Returns the same CSP as BUG-052. Missing directives:
- `base-uri 'self';` — prevents `<base href="…">` injection.
- `object-src 'none';` — prevents plugin/object embed.

## Expected
Modern CSPs include both. The site omits them.

## Evidence
- `even-more.json` `hdr___` rows

## Fix prompt

```
Task: Add `base-uri 'self';` and `object-src 'none';` to the CSP.
Acceptance:
1. CSP header now contains both directives.
2. Verifiable with curl.
```
