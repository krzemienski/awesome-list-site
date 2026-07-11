# BUG-041 — Login form pre-fills the email field with "admin@example.com" for every visitor

**Severity:** HIGH (UX / privacy / security theatre)
**Affected page:** https://awesome.video/login

## Reproduction
1. Open https://awesome.video/login in a fresh chromium at 1440×900.
2. The email field is pre-filled with `admin@example.com`.
3. Open the same URL in a different browser (no cookies) — same pre-fill.
4. Any visitor who lands on /login sees a placeholder suggesting a real
   account. Worse, they may assume their email has been set and only
   need to enter a password — and copy the admin address verbatim.

## Expected
The email field should be empty by default, with `placeholder="you@example.com"` (a generic hint) and `autocomplete="username"`. No pre-fill — leave the visitor free to type any address.

## Actual
The input `value` attribute or React `defaultValue` is hardcoded to
`admin@example.com`. This is visible to every visitor on every visit.

## Evidence
- `screenshots/login_form.png` (early capture): `<input name="email" type="email" placeholder="admin@example.com" ...>`
- `public-deep` audit: `screenshots/public2_login_1440.png` confirms the value across reproductions
- `phase2-login.js` console output earlier: `<input name="email" type="email" placeholder="admin@example.com" ...>`

## Fix prompt

```
Task: The email field on https://awesome.video/login is rendered with the
value attribute or React defaultValue set to "admin@example.com" for
every visitor. Reproduce:
  await page.goto('https://awesome.video/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const v = await page.inputValue('input[name="email"]')  // prints admin@example.com

Acceptance:
1. The input has no pre-filled value (empty by default).
2. The placeholder is generic: "you@example.com" or similar.
3. autocomplete="username" is set so password managers can identify it.
4. Verifiable with Playwright: `page.inputValue('input[name="email"]')` is "" before any user input.
```

---

STATUS: FIXED in plans/awesome-video-bughunt-fixes/phase-04.md (already-fixed at source — Login.tsx:57 `defaultValues.email = ""`; verified 2026-07-10)
</input>
