# BUG-006 — /signup returns 404; users land on /register with no UI hint

**Severity:** LOW (UX)
**Affected page:** https://awesome.video/signup

## Reproduction
1. Open https://awesome.video/signup in a fresh chromium — 404 {"message":"Not found"} is served.
2. Open https://awesome.video/register — 200, the actual signup page.
3. From a navigation perspective, the canonical "sign up" word is `/signup` (1.5× more common than /register in U.S. mental models) and a default Replit/Next.js scaffold uses that path. A user searching for "Where do I sign up?" may guess `/signup` first and see a 404.

## Expected
Either:
- Rename `/register` to `/signup` and update all in-app links, or
- Add `/signup` as an alias that 308-redirects to `/register`, or
- Document the auth entry point in the header (the top nav has Home / Submit / Journeys / Advanced / Theme — there is no Login or Sign up CTA).

## Actual
`/signup` returns 404. There is no Login/Sign-up link in the public header either — only a subtle "Login" entry inside /settings/theme's sidebar footer. New visitors cannot easily find the registration route.

## Evidence
- security-probe.json: `/signup => 404`, `/register => 200`
- landing page top nav: Home, Submit Resource, Learning Journeys, Advanced, Theme — no Login, no Sign up

## Fix prompt

```
Task: New visitors to https://awesome.video/ have no obvious path to
/register (the only working signup route). /signup returns 404.
Confirm:
  curl -s -o /dev/null -w '%{http_code}' https://awesome.video/signup   # prints 404
  curl -s -o /dev/null -w '%{http_code}' https://awesome.video/register # prints 200
And the top-level nav of the landing page has no Sign-up / Login CTA.

Acceptance (any one of):
(a) Add a server-side 308 from /signup → /register, OR
(b) Add a "Sign up" link in the public nav that routes to /register, OR
(c) Rename /register to /signup and update internal links.

Pick (c) if you control the routes — it's the most discoverable. Verify
with Playwright that the home page exposes a Login / Sign-up CTA and
that the target route loads the form.
```
