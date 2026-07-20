# NB-032 (LOW) — Export button: no double-click guard (MD×2 downloads)
**Verdict: FIXED.** Two-part guard in client/src/components/ui/export-tools.tsx handleExport:
1. `exportingRef` re-entrancy latch set synchronously on entry (covers the async PDF path).
2. Cooldown reset: the latch is released via `setTimeout(600ms)` in `finally`, NOT immediately. Root cause found live: synchronous formats (MD/JSON/CSV/YAML/HTML) complete the whole export INSIDE the first click's dispatch, so an immediate reset re-armed the handler before the double-click's second click landed → 2 downloads. State `isExporting` alone can't help for the same reason (the button never visibly disables).

Live probe (Playwright, /advanced → Export tab → "Export 1809 Resources", same-tick double click via el.click();el.click()):
```
NB-032 downloads after same-tick double-click: 1 PASS
NB-032 downloads after follow-up single click: 2 PASS (guard resets)
```
Deliberate repeat exports after the 600ms cooldown still work. Probe: /tmp/nbev/probe32c.mjs.
