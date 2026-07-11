# BUG-036 — `<meta name="theme-color" content="#ff3d52">` clashes with site palette (crimson, not the dark bg)

**Severity:** LOW
**Affected page:** all pages

## Reproduction
```bash
curl -s https://awesome.video/ | grep 'theme-color'
```
Returns `<meta name="theme-color" content="#ff3d52">`. The color #ff3d52 is the "Crimson" accent color used throughout the UI for borders, focus rings, and call-out elements — NOT the actual page background.

## Expected
A theme-color meta should approximately match the body background so
the mobile browser chrome (address bar, status bar) blends with the
page. The site has a dark default (`<html class="dark">` and body
bg `rgb(0,0,0)`), but theme-color advertises crimson.

## Actual
On iOS Safari and Android Chrome, the address bar shows a crimson
strip across the top while the page below is black. The mismatch is
visually jarring, especially because the chrome animates when
scrolling.

## Evidence
- `quickprobe.json`, `metaHead.themeColor: '#ff3d52'`
- HTML inspection

## Fix prompt

```
Task: <meta name="theme-color" content="#ff3d52"> disagrees with the
site's actual body background (`#000000`). Pick the dark color
matching the body so the mobile chrome looks consistent.

Acceptance:
1. <meta name="theme-color"> matches body background for dark mode (the
   default mode). Optionally add a <meta name="theme-color" media="(prefers-color-scheme: light)"> for future Light mode.
2. Verifiable with curl + grep.
```
