# BUG-068 — Admin pages (admin, login, register) lack `noindex` in head meta

**Severity:** LOW (SEO)
**Affected page:** /admin, /login, /register, /forgot-password, /reset-password

## Reproduction
```bash
for u in /admin /login /register /forgot-password /reset-password; do
  echo -n "  $u : "
  curl -s "https://awesome.video$u" | grep -E 'meta name="robots"' | head -1
done
```
No `<meta name="robots">` tag — Google can index these pages.

## Expected
Each of /admin, /login, /register, /forgot-password, /reset-password
should emit `<meta name="robots" content="noindex, nofollow">` (and
optional `<link rel="canonical">` if same canonical href is needed).

## Actual
No robots directive on auth-gated pages.

## Evidence
- `contrast-seo-vuln.json`, `seo[].robots` (always null)

## Fix prompt

```
Task: Add `<meta name="robots" content="noindex, nofollow">` to all
auth-flow pages: /admin, /login, /register, /forgot-password,
/reset-password, /bookmarks, /profile, /settings/*.

Acceptance:
1. curl `https://awesome.video/admin` includes the meta robots noindex tag.
2. Same for /login, /register, /forgot-password, /reset-password,
   /bookmarks, /profile, /settings/*.
```
