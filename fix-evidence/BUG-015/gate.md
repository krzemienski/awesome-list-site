# VG-015 — BUG-015 (MEDIUM): Theme font override is a silent no-op

## Root cause
Body text renders with `font-family: var(--font-body)` (`client/src/index.css` `html, body` rule + `design-system.css`), but the font picker's `applyFontOverride()` and the `client/index.html` pre-paint boot script only set `--font-sans` — a variable consumed solely by Tailwind's `font-sans` utility alias. Picking any font (incl. JetBrains Mono) changed nothing visible. The V11 drift verifier asserted `--font-sans`, so it green-lit the no-op.

Secondary: **DM Sans** and **Source Sans 3** are offered by the picker but their webfonts were never loaded (absent from both Google Fonts URLs) — even with correct plumbing they would silently render system-ui.

## Fix
- `client/src/lib/font-options.ts` `applyFontOverride()`: sets/removes **both** `--font-body` (drives body/UI text) and `--font-sans` (keeps Tailwind utilities in agreement).
- `client/index.html` boot script: same two properties pre-paint (FOUC-free persistence).
- `client/index.html` `ALT_FONTS_URL`: added `DM Sans` + `Source Sans 3` faces.
- `scripts/verify-fixes.mjs` V11: now asserts `--font-body` (the operative variable).

## Live evidence (dev, real browser — /settings/theme)
| Step | Result |
|---|---|
| Default computed body font | `Inter, system-ui, sans-serif` |
| Click JetBrains Mono | computed body font → `"JetBrains Mono", ui-monospace, monospace` **immediately**; `document.fonts.check` = true (real face rendering, not fallback) |
| Hard reload | still JetBrains Mono; picker card `aria-checked="true"` |
| Navigate to `/` | body font still JetBrains Mono (app-wide) |
| Click DM Sans | computed → `"DM Sans", system-ui, sans-serif`; face loaded = true (was impossible before — webfont never fetched) |
| Click System default | computed restored to `Inter, system-ui, sans-serif` |
| Reload after restore | still Inter (no stale override) |

Screenshots: `bug015-1-default.png`, `bug015-2-jetbrains.png` (entire UI incl. sidebar/preview in mono + "Font applied" toast + checked card), `bug015-3-home-jetbrains.png`, `bug015-4-restored.png`.

## Checks
- tsc --noEmit: clean.

**Verdict: PASS**
