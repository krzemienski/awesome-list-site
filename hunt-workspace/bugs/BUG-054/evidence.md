# BUG-054 — Several pages do not set Permissions-Policy / Feature-Policy for camera/mic

**Severity:** LOW (defense-in-depth)
**Affected page:** select pages

## Reproduction
```bash
for u in / /recommendations /about; do
  echo -n "  $u : "
  curl -sI "https://awesome.video$u" | grep -i permissions-policy
done
```
Some pages emit `permissions-policy: camera=(), microphone=(), geolocation=()` and others omit. Inconsistent.

## Expected
A consistent Permissions-Policy header on every page.

## Evidence
- `contrast-seo-vuln.json`, `hdr___` rows

## Fix prompt

```
Task: Emit `permissions-policy: camera=(), microphone=(), geolocation=()` on every response (or `*` if camera/mic/geolocation are needed).
Acceptance:
1. Every page returns the same Permissions-Policy header.
2. Verifiable with curl + grep.
```
