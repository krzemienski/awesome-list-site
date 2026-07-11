# BUG-079 — /login email "admin@example.com" prefill is also in placeholder attribute

**Severity:** MEDIUM
**Affected page:** https://awesome.video/login

## Reproduction
```bash
curl -s https://awesome.video/login | grep -A1 'name="email"'
```
Returns:
```html
<input name="email" type="email" placeholder="admin@example.com" ...>
```
The placeholder shows `admin@example.com` (not "you@example.com").
Combined with the value being prefilled (BUG-041 / BUG-016), an
unwary visitor sees the admin email rendered in two slots.

## Expected
Placeholder should be `you@example.com` (a generic hint) and the
input should be empty by default.

## Actual
Both the value and the placeholder are the admin email.

## Evidence
- `phase2-login.js` captured the input — placeholder matches.

## Fix prompt

```
Task: Login form's email field has placeholder="admin@example.com".
Change to "you@example.com". (Already covered for value by BUG-041.)

Acceptance:
1. <input name="email"> has placeholder="you@example.com" (or
   similar generic).
2. Verifiable with curl.
```

---

STATUS: FIXED in plans/awesome-video-bughunt-fixes/phase-04.md (Login.tsx:162 placeholder changed `admin@example.com` → `you@example.com`; verified 2026-07-10)
</input>
