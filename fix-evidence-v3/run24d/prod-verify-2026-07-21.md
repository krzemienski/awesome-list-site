# Run24D prod verification attempt — July 21, 2026

Verdict: **BLOCKED — production has not been republished with Run24D yet.**

## Evidence (live probes against https://awesome.video)

- Site up: `GET /` → 200, last-modified Mon, 20 Jul 2026 16:01:26 GMT.
- Prod bundles: `/assets/index-CUa86tgx.js`, `/assets/index-D0wsfVMs.css`.
- CSS marker check (`index-D0wsfVMs.css`):
  - `ButtonText` (R5-056 forced-colors button border): **0 matches** (dev `client/src/index.css` has it).
  - `.print-only` (R5-053 printed card URLs): **0 matches** (dev has it).
  - Only `forced-colors` rule present is Tailwind's stock `.outline-hidden` fallback — pre-Run24D.
- JS marker check (`index-CUa86tgx.js`):
  - `breadcrumb-mobile-current` / `Current page` aria-label (R5-057 mobile crumb): **0 matches** (dev `AppHeader.tsx` has both literals).

Conclusion: the deployed bundle predates Run24D. The 8 Run24D fixes (R4-039, R4-070, R5-010, R5-026, R5-027, R5-053, R5-054, R5-056, R5-057) remain dev-only, as journaled in replit.md ("Needs republish").

## What still needs to happen

1. Owner republishes from the main workspace (task agents cannot trigger publish).
2. Re-run the spot-checks on prod per task-189:
   - Print output: admin page (1 real page, tables full content) + a category card grid (URLs printed, dead buttons hidden).
   - Profile header at tablet widths (640–1024: no overlap, email wraps).
   - Mobile breadcrumb at ≤375 (compact current-page crumb visible).
   Reference dev evidence: fix-evidence-v3/run24d/ (admin.pdf, category.pdf, profile-700/812/900.png, breadcrumb-375.png).
   Cheap pre-check before browser work: `curl -s https://awesome.video/assets/index-*.css | grep -c ButtonText` — must be ≥1.
