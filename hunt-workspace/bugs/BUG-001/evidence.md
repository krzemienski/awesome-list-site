# BUG-001 — CSP directive blocks Replit feedback-widget on every page

**Severity:** HIGH
**Affected page:** every same-origin page (192 of 205 crawled)
**Affected viewport:** all three (desktop/tablet/mobile)

## Reproduction
1. Open any same-origin page at https://awesome.video/ in a fresh browser session.
2. Open DevTools console.
3. Console shows: `Loading the script 'https://replit-cdn.com/feedback-widget/widget.global.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://replit.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked.`

## Expected
The feedback-widget either renders, or it is not requested at all. There is no console error.

## Actual
The HTML for the widget appears to be injected, but the third-party script cannot execute under CSP `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://replit.com` (missing `https://replit-cdn.com`). The browser shows a `Refused to load the script ... because it violates the following Content Security Policy directive` error on every page. Even on the production home page (https://awesome.video/).

## Evidence
- `screenshots/landing-1440-initial.png` — landing at 1440×900
- crawl-results.json: 192 of 205 pages record this CSP error in `consoleErrs`
- `evidence/console-error.txt` — exact CSP error text captured

## Fix prompt (self-contained for a coding agent)

```
Task: Fix the Content Security Policy on https://awesome.video/ so the
Replit feedback-widget script (https://replit-cdn.com/feedback-widget/widget.global.js)
loads successfully. The site injects this script via <script src=
"https://replit-cdn.com/feedback-widget/widget.global.js">, but the
response header Content-Security-Policy includes
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://replit.com;
which does NOT allow the replit-cdn.com origin, so the browser blocks it
on every page (192/205 pages in black-box crawl). Pick one of:
  (a) Add 'https://replit-cdn.com' to script-src.
  (b) Stop injecting the widget (the layout is leaving a non-functional
      feedback affordance somewhere on every page).
  (c) Self-host the widget script.
Acceptance: navigate to https://awesome.video/, https://awesome.video/submit,
https://awesome.video/login, https://awesome.video/recommendations, and
https://awesome.video/settings/theme in a fresh chromium (Playwright).
The DevTools console must contain zero entries matching
"replit-cdn.com" or "feedback-widget". Verify via:
  p.on('console', m => console.log(m.type(), m.text()));
```
