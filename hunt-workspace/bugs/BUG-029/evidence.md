# BUG-029 — Public landing page has no Login / Sign-up link in primary navigation

**Severity:** MEDIUM (auth discoverability)
**Affected page:** https://awesome.video/

## Reproduction
1. Open https://awesome.video/ in a fresh chromium at 1440×900.
2. Inspect every `<a href>` in the visible header (top bar + nav). There
   is no `<a href="/login">`, no `<a href="/register">`, and no `<a href="/signup">`.
3. Compare with the top-bar buttons: Home, Submit Resource, Learning
   Journeys, Advanced, Theme. The Login / Sign-up actions are missing
   from the primary navigation surface.
4. New visitors cannot register without typing the URL directly into
   the address bar.

## Expected
At minimum, a "Sign in" or "Log in" link in the top bar — preferably
both a Log-in and a Sign-up CTA.

## Actual
The header omits any auth CTA. Directing first-time visitors to /register requires sharing the URL out-of-band.

## Evidence
- `even-more2.json`, `authLinks.hasLogin: false`, `hasRegister: false`, `hasSignup: false`
- `landing_search_check.png`

## Fix prompt

```
Task: https://awesome.video/ has no Log-in or Sign-up link in the public
top-bar navigation. Confirm:
  curl -s https://awesome.video/ | grep -oE 'href="[^"]*"' | grep -E 'login|signup|register'
Today returns nothing.

Acceptance:
1. Top-bar of /, /category/*, /resource/*, /journeys, /advanced shows
   a "Sign in" link that points to /login.
2. Optionally a "Sign up" link that points to /register.
3. Both are styled consistently with the existing nav items.
4. Visible at all three viewports (1440, 768, 375).
5. Verifiable with curl that the HTML contains those hrefs.
```
