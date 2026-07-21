---
name: UI-audit harnesses must verify activation
description: Tab/panel audit sweeps must assert the target panel is actually active before scanning, or every cell silently scans the default panel.
---

# UI-audit harnesses must verify activation

**Rule:** any automated sweep that clicks a tab/accordion/menu before scanning (axe, DOM dump, screenshot) must *verify* the activation succeeded (e.g. trigger has `aria-selected="true"` / `data-state="active"`) and count a harness failure as a test failure. Never trust a click that didn't throw.

**Why:** a WP-6 axe sweep "passed" 45 admin cells green, but 8 tab triggers had no stable selector — the click silently missed and axe scanned the default panel every time. The tell: DOM dumps for different tabs were **byte-identical (same md5)**. All "green" runs had to be re-run; the strict re-run surfaced a real contrast failure the fake runs missed.

**How to apply:**
- Match triggers by stable selector (data-testid preferred; radix fallback `[id$="-trigger-<name>"]`).
- After click: poll for the active state; if not active, try a hash-URL reload fallback; if still not active, emit HARNESS-FAIL and count it as a violation (nonzero exit).
- Cross-check evidence integrity: md5 dumps per cell must differ; each dump must show its own tab active.
- Viewport-dependent columns (`hidden lg:table-cell`) mean a component can pass at 375/768 and fail at 1280 — sweep all breakpoints before declaring a surface green.
