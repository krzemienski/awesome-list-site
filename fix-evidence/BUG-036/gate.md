# VG-036 — Mobile journey titles are squeezed → PASS

## Root cause
Profile "Learning Journeys" rows put the title in a flex row beside the
"Completed" badge: at 320px the badge squeezed titles to **95px wide / 3 lines**
(measured live: "DRM & Content Protection").

## Fix
1. `client/src/pages/Profile.tsx`: journey-row header is `flex-col` on mobile
   (badge stacks under the title, `self-start flex-shrink-0` from `sm:` up);
   title gets `line-clamp-2 break-words` + full text in `title` tooltip.
2. `client/src/pages/Journeys.tsx`: card title link hardened with
   `line-clamp-2 break-words text-left` + `title` tooltip (was unclamped).

## Live evidence (Playwright, authed, dev — all journey title surfaces)
Probe = every journey title (`link-journey-title-*`, step `h3`, profile journey
`h4`, page `h1`) at 320/375/768px on /journeys, /journey/7 (enrolled), /profile:

| Surface | 320px | 375px | 768px |
|---|---|---|---|
| /journeys card titles | minW 206, ≤2 lines | minW 261, ≤2 lines | minW 130 (short-title content width), ≤2 lines |
| /journey/7 step titles | 166px, ≤2 lines | 221px, ≤2 lines | 274px, ≤2 lines |
| /profile journey titles | **172px, ≤2 lines** (was 95px/3) | 227px, ≤2 lines | ≤2 lines |

- All journey titles left-aligned (`text-align: start`); the one non-left element
  is the profile display-name header ("Admin User", centered by design — not a
  journey title).
- /journey/7 `h1` wraps to 3 lines at 320px at **full container width (206px),
  left-aligned, no adjacent controls** — natural page-heading wrap, not a squeeze;
  the two-line cap applies to card/list titles per the finding.
- Horizontal overflow: none at any width (scrollWidth == clientWidth everywhere).
- No title is squeezed near ~110px anywhere (minimum real container width 166px).

Screenshots: vg036-320-journey7.png, vg036-375-journeys.png. Verdict: **PASS**
