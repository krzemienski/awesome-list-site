# BUG-003 — /settings/theme has no Light/Dark toggle

**Severity:** HIGH
**Affected page:** https://awesome.video/settings/theme
**Affected viewport:** all (1440, 768, 375)

## Reproduction
1. Open https://awesome.video/settings/theme in a fresh chromium at 1440×900.
2. The page shows preset themes (Editorial / Terminal / Geist / Brutalist / SwissGrid), font choices, accent colors (Crimson, Magenta, etc.), and an inline "System default" label. There is no visible toggle to switch between **Light** and **Dark** mode.
3. The `<html>` element reads `class="dark" data-system="editorial" data-accent="crimson"` and the body has `background-color: rgb(0, 0, 0)`.
4. Click any of the theme swatches (Editorial, Terminal, …). The `data-system` attribute updates (e.g. → `data-system="editorial"`), but the `<html class="dark">` and `background-color: rgb(0, 0, 0)` remain unchanged. Clicking accent color "Crimson", "Magenta", etc. does not change `data-accent` either when the page first loads with `crimson` already selected.
5. There is no visible Light / Dark / System button on the page. There is only a "Toggle Sidebar" button (which toggles the sidebar — unrelated).

## Expected
`/settings/theme` should expose a Light / Dark / System mode toggle, given that dark mode is the site's identity. The toggle should change `document.documentElement.classList` between `dark` and `light`, and update the body's computed `background-color` accordingly.

## Actual
Page claims to provide theme customization but provides no Light/Dark switch. The theme is permanently dark and permanently dark background (`rgb(0, 0, 0)`). Anyone using a Light-mode-only browser can't reach a Light experience even when the surrounding chrome (preset names like "Editorial", accent colors) suggests a light-mode-controlled environment.

## Evidence
- `screenshots/theme_settings_initial.png` — page as loaded
- `screenshots/theme_repro1_before.png` — `<html class="dark">`, bg `rgb(0,0,0)`
- `screenshots/theme_repro1_after.png` — after clicking each available control, still dark
- `screenshots/theme_repro1_clicked_*.png` — clicks captured, no class change

## Fix prompt

```
Task: Add a working Light / Dark / System mode toggle on
https://awesome.video/settings/theme. Today, the page lists theme presets,
font choices, and accent colors, but exposes no Light/Dark switch. The
<html> element stays at class="dark" and body background-color stays at
rgb(0, 0, 0) no matter which preset/accent is clicked.

Reproduction: navigate to /settings/theme, capture
document.documentElement.className and
getComputedStyle(document.body).backgroundColor; click every button
including "Editorial", "Terminal", accent colors; the captured values
must change for some click.

Acceptance:
1. The page shows a visible "Light" / "Dark" / "System" control (radio
   group, segmented control, or three buttons).
2. Selecting "Light" sets document.documentElement.classList to NOT
   contain "dark" and the body background becomes light (e.g. #fff or
   rgb(255,255,255) or a theme-light equivalent).
3. Selecting "Dark" reverts to classList containing "dark" with a dark
   background.
4. Selection persists across navigation to /, /submit, /login.
5. Verifiable via Playwright with the snippet:
   await p.evaluate(() => [document.documentElement.className, getComputedStyle(document.body).backgroundColor])
```
