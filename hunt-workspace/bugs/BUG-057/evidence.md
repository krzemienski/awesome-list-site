# BUG-057 — /api/admin/users POST without auth returns 401 but the body reveals "Unauthorized" — schema disclosure

**Severity:** LOW
**Affected endpoint:** /api/admin/users

## Reproduction
```bash
curl -i -s -X POST https://awesome.video/api/admin/users \
  -H 'Content-Type: application/json' \
  -d '{"isAdmin":true}'
```
Returns HTTP 401 `{"message":"Unauthorized"}`. Sibling: GET /api/admin/users returns the same shape. The route exists, returns 401, and confirms the existence. (Information disclosure: an attacker can enumerate admin endpoints this way.)

## Expected
A 401 with a non-disclosing body (or 404) would reduce enumeration surface.

## Actual
The path /api/admin/users returns 401 with `"Unauthorized"` — explicit
confirmation the route exists.

## Evidence
- `quick4.json`, `admin_users_POST_*` rows

## Fix prompt

```
Task: Unauthenticated POSTs to /api/admin/users are 401 — disclose the
route exists. Either:
(a) 404 all admin routes for anonymous (treat /api/admin/* as 404),
(b) keep 401 but use a generic body so attackers can't enumerate
   route names.

Acceptance:
1. POST /api/admin/users with empty body returns 404 (or 401 with a
   generic no-name body).
2. Same for any /api/admin/* path attempted anonymously.
```
