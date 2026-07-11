# BUG-048 — /login submits empty fields silently (no inline error before server responds)

**Severity:** MEDIUM (a11y / UX)
**Affected page:** https://awesome.video/login

## Reproduction
```js
await page.goto('https://awesome.video/login', { waitUntil: 'domcontentloaded' });
await page.click('button[type="submit"]');  // submit with empty fields
await page.waitForTimeout(1500);
const txt = await page.evaluate(() => document.body.innerText);
```
Inspect the document. The page may show generic field-level constraint errors (HTML5 validity) in browser DevTools, but the page body still renders with prefilled `admin@example.com`. The submit handler likely relies on the browser's HTML5 validation popup — for a11y, this is invisible to screen readers using non-modal presentation.

## Expected
Inline `aria-describedby` error text under each empty field, with `role="alert"`, is the standard pattern.

## Actual
The submit attempts to navigate with empty fields but no inline aria text. (HTML5 native validation popup fires in some browsers but it's not always accessible.)

## Evidence
- `contrast-seo-vuln.json`, `loginEmptySubmit = { errs: [...], inputsValidity: [...] }`
- `screenshots/login_empty_submit.png` (early capture)

## Fix prompt

```
Task: When /login is submitted with empty fields, the page should show
inline, screen-reader-accessible error text per field, not rely solely
on the browser's HTML5 validation popup (which is modal and inconsistent).

Acceptance:
1. Each input field has an associated <span role="alert"> that's populated
   with the validation error when submit is clicked empty.
2. The error elements are visible AND in the accessibility tree.
3. Verifiable with Playwright + axe-core or just by reading the live DOM.
```

---

STATUS: FIXED in plans/awesome-video-bughunt-fixes/phase-04.md (form.tsx FormMessage emits `role="alert"` + aria-describedby on validation error; Zod schema rejects empty fields; verified 2026-07-10)
</input>
