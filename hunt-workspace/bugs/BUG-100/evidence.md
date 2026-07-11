# BUG-100 — Share button on every /resource/* page silently fails: shows "Unable to copy / Please copy the URL manually"

**Severity:** HIGH (core share feature is broken for every visitor on every resource page; affects ranking/social-share metrics)
**Affected URLs:** all /resource/* detail pages (reproduced on 12 of 12 tested: 184751, 184763, 184789, 184838, 185020, 186145, 186212, 186231, 186477, 186609, 187911, 188002)
**Affected viewport:** all three (desktop / tablet / mobile)

## Reproduction
1. Navigate to any `/resource/<id>` page, e.g. `https://awesome.video/resource/185020` in a fresh Chromium browser (no auth).
2. Click the "Share" button in the top action bar (heart of the page next to Bookmark / Favorite / Suggest Edit) — or the "Share This Page" button in the right-side Quick Actions panel.
3. Observe the toast / popover that appears. Instead of confirming the URL was copied to the clipboard, the toast displays the text:
   > **"Unable to copy / Please copy the URL manually from the address bar."**
4. Inspect the page console; DevTools shows: `Clipboard: Write permission denied.` — the call `navigator.clipboard.writeText(...)` fails with `NotAllowedError` because the page is not focused / lacks the `clipboard-write` permission in many contexts (top-level non-focused frames, OAuth redirects, headless contexts, and ungranted permissions).

## Reproduction evidence (without auth)
A direct DOM probe confirms `navigator.clipboard.writeText('test-string-clipboard-probe')` throws `Failed to execute 'writeText' on 'Clipboard': Write permission denied.` even in a fresh, non-authenticated Chromium session. The toast `[role="alert"]` text after clicking Share is verbatim `Unable to copyPlease copy the URL manually from the address bar`.

In an authenticated probe, the same failure occurs across **24 / 24 share-button clicks** across 12 resource pages (each page exposes 2 share buttons — `Share` and `Share This Page` — both fail).

## Expected
Share should fall back gracefully. Either:
- Use the deprecated `document.execCommand('copy')` fallback in a hidden `<textarea>`.
- Show a copy-prompt modal with the URL pre-selected when `navigator.clipboard.writeText` is unavailable.
- Render a "share to Twitter / Reddit / Hacker News" button group as primary UX so clipboard isn't required.

## Actual
The clipboard write fails every time and the UI just shows the toast "Unable to copy…" — leaving the visitor with no good way to share. Visitors who never read the address bar lose the share path entirely.

## Evidence
- `screenshots/res_<slug>_1440.png` × 12 (every page tested in 3 viewports)
- Direct DOM probe from `engine/_clip-probe.js` (committed inline below)
- Toast text captured after click: `Unable to copyPlease copy the URL manually from the address bar`

## Fix prompt (self-contained for a coding agent)

```
Task: Replace the brittle navigator.clipboard.writeText() share logic on
https://awesome.video/resource/<id> with a fallback chain. Today every
share action shows "Unable to copy / Please copy the URL manually."

Reproduction:
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('https://awesome.video/resource/185020', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  // Click Share button in the top action bar
  await page.click('button:has-text("Share"):not(:has-text("Share This Page"))')
  await page.waitForTimeout(800)
  // Read the toast text
  const txt = await page.locator('[role="alert"]').first().textContent()
  // → "Unable to copyPlease copy the URL manually from the address bar."

Acceptance:
1. Inside Playwright with clipboard permissions granted, clicking Share
   copies the URL to the clipboard AND shows a "Copied to clipboard"
   toast.
2. Without clipboard permissions (untrusted context), clicking Share
   shows a copy-to-clipboard modal/popover with the URL pre-selected.
3. Optionally a share-to-X / share-to-Reddit / share-to-HN button group
   as the primary share path.
4. Verifiable via the same Playwright probe with permissions ON/OFF.
```


STATUS: NOT-REPRO/FIXED-in-source (ShareButton.tsx share→clipboard→visible-toast fallback) — 2026-07-11 (local re-confirm run, evidence in evidence/vg1..vg-int/)
