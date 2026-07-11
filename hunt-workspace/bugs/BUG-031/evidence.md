# BUG-031 — No <meta name="theme-color"> tag (mobile chrome ignores dark default)

**Severity:** LOW (mobile UX)
**Affected page:** https://awesome.video/

## Reproduction
```bash
curl -s https://awesome.video/ | grep -E 'theme-color'
```
Returns nothing. There is no `<meta name="theme-color">` in <head>.

## Expected
A site that is dark-mode-by-default should set
`<meta name="theme-color" content="#000000">` (or the actual dark bg
color) so mobile Safari / Chrome use that color for the address bar.

## Actual
No theme-color meta tag — mobile address bar uses its default light or generic color.

## Evidence
- `even-more2.json`, `metaHead.themeColor: null`

## Fix prompt

```
Task: Add a <meta name="theme-color"> to <head> on every page. The site
is dark-mode-by-default — pick the dark background color (e.g.,
#000000, the same color the body uses today).

Acceptance:
1. Every public page contains `<meta name="theme-color" content="...">`.
2. Verifiable: `curl -s https://awesome.video/ | grep theme-color`
   returns at least one match.
```
