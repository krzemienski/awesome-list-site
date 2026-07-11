# BUG-064 — /api/users is missing (no public profile lookup), yet internals use /api/users

**Severity:** LOW
**Affected endpoint:** undocumented /api/users

## Reproduction
```bash
for p in /api/users /api/users?slug=foo /api/users/foo /api/users?id=1; do
  echo -n "  $p : "
  curl -sIL -o /dev/null -w '%{http_code}\n' "https://awesome.video$p"
done
```
All 404.

But the audit pulled authentication cookies from `connect.sid` — the
session is keyed against a user record. Test if /api/users is the
implied namespace:
- /register uses /api/users/register (probably)
- /login uses /api/users/login (probably)

(AUTH the namespace inconsistency in BUG-005.)

## Evidence
- `quickprobe.json`, `api__api_users_*` rows

## Fix prompt

```
Task: Documentation gap. The site lacks a public /api/users endpoint.
Either (a) document that /api/users/* exists with concrete routes, or
(b) remove the comment in BUG-005 since the implementation uses
/api/users/* not /api/auth/*.

Acceptance:
1. Either /api/users/<id> returns the public-facing user data (NO
   PII, just name + bookmarks count), or
2. The code path uses /api/users/* consistently and the docs reflect that.
```
