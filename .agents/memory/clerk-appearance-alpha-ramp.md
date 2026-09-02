---
name: Clerk appearance variables get Clerk's own alpha ramp
description: Why DS colors handed to the Clerk widget can render invisible or not render at all, and how to verify what it actually painted.
---

# Clerk appearance: what the widget does to the colors you give it

## `colorBorder` is re-tinted, never painted at full strength
Clerk derives an alpha scale from `colorBorder` and paints EVERY hairline in the
widget from it — card ring, inner card ring, divider, social buttons, and the
form field — at roughly 3–11% at rest and ~28% on hover/focus.

**Why:** a DS border token is usually authored as light ink at low alpha
(`rgba(244,243,238,0.16)`). Pre-compositing it over a black page yields a
near-black hex; Clerk then applies 11% of THAT, and the border disappears
completely — the whole auth card loses its structure, not just the field.

**How to apply:** hand border-role variables the token's ink at FULL opacity and
let Clerk's ramp set the weight. Corollary: the token's own alpha cannot survive,
so per-system border *weight* (e.g. a deliberately stark 100% border) collapses
to Clerk's ramp. Ink-role variables (`colorForeground`, `colorInputForeground`,
`colorMutedForeground`) are the opposite — those ARE painted as given, so they
still need pre-compositing.

## Borders are box-shadow rings, so `borderColor` overrides are inert
Clerk renders its controls at `border-width: 0` and draws the visible ring with
`box-shadow`. A per-element `borderColor` in `appearance.elements` therefore does
nothing — it looks correct in review and paints nothing.

## Element keys are variant-specific
`socialButtonsBlockButton` styles do not apply when Clerk renders the icon-button
variant (`.cl-socialButtonsIconButton`), and vice versa. An override can sit
dormant for months while the code reads as if it were applied. Always confirm
which variant the live widget rendered before trusting an element override.

## Verification notes
- Measure RENDERED pixels (screenshot + raw buffer), not just the computed value
  of the variable: the variable can be correct while the painted result is
  invisible.
- Park the mouse far from the control before measuring "rest" — hovering ramps
  the border alpha from ~11% to ~28% and silently inflates the reading.
- Chromium matches `:focus-visible` on text inputs even for mouse clicks, so a
  global `:focus-visible` outline rule already covers Clerk's fields; there is no
  need to map a focus-ring variable to get an on-brand focus indicator.
