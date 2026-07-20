# VG-013 — BUG-013 (MEDIUM): Open Graph image clips long titles

## Root cause
`buildOgSvg` (server/routes.ts) wrapped title lines by **character count** (26 chars @ 78px, 34 @ 60px, 44 @ 46px). The PNG rasterizer (sharp/librsvg) renders with a wide bold fallback face — not Inter — so 26 chars at 78px measures ≈1250px against a 992px safe area (title x=104 → card inner right edge x=1144, 48px padding). Long titles ran past the card border and off the 1200px canvas (see `long196-before.png`, `long158-before.png`).

## Fix
Wrap by **estimated pixel width** against the real 992px budget: per-character em-advance table calibrated generously for DejaVu-Bold-class fallbacks (narrow 0.34 / medium 0.45 / caps+digits 0.76 / wide 0.98 / default 0.62), same 78→60→46px step-down, hyphen-split for single over-wide words, and the >3-lines ellipsis now trims at a **word boundary** until `line + '…'` fits the pixel budget.

## Live evidence (real endpoint, real resource titles)
| Request | HTTP | PNG | Result |
|---|---|---|---|
| `/og-image.png?path=/` (control) | 200 | valid 1200×630, 62,813 B | **byte-identical before/after** (`cmp` clean) |
| `?path=/resource/186111` (196-char title) | 200 | valid 1200×630 | 3 lines @46px, ends `…Testbed…` at word boundary, fully inside card |
| `?path=/resource/186249` (158-char) | 200 | valid 1200×630 | wraps cleanly, no clipping (was running off-canvas) |
| `?path=/resource/185720` (99-char) | 200 | valid 1200×630 | full title, 3 lines, inside safe area |

All four PNGs inspected at native 1200×630: no mid-word clips, no text past the card border, valid non-empty PNG signatures/dimensions verified from response bytes.

Files: `long196-before.png` / `long196-after.png`, `long158-before.png` / `long158-after.png`, `long99-after.png`, `short-control-before.png` / `short-control-after.png`.

## Checks
- tsc --noEmit: clean.

**Verdict: PASS**
