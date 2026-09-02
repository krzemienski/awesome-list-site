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

## `borderRadius` is a base, not the rendered corner
The widget derives a whole radius ladder from the single `borderRadius`
variable: controls (inputs, buttons, OTP cells) land on the base itself, the
inner `.cl-card` on ~1.33×, and the outer `.cl-cardBox` — the clipping surface
whose corner a visitor actually sees, wrapping card + footer strip — on 2×.

**Why:** handing it a design-system *card* radius makes every control too round,
and handing it the *control* radius leaves the card 2× rounder than the cards
next to it. Neither single value reproduces a two-step radius ladder.

**How to apply:** pass the control radius as the base and pin `cardBox` to the
card radius in `appearance.elements`; unlike `borderColor`, a radius override IS
honoured (the ring is a box-shadow, which follows the element's own radius).
Clerk splits the base into number + unit for that math, so `calc()`, `clamp()`
or a unitless value comes back out as `NaNpx` — hand it a plain length or leave
the variable unset.

## Element keys are variant-specific
`socialButtonsBlockButton` styles do not apply when Clerk renders the icon-button
variant (`.cl-socialButtonsIconButton`), and vice versa. An override can sit
dormant for months while the code reads as if it were applied. Always confirm
which variant the live widget rendered before trusting an element override.

**How to apply:** style BOTH variant keys. Clerk chooses the variant from how many
providers the dashboard has enabled, so the live answer can change with no code
change on this side.


## Provider marks are painted, not shipped as images
The current widget draws a monochrome provider mark (Apple, GitHub, X) as a CSS
`mask-image` FILLED with `background-color: colorForeground`, and a brand-colour
one (Google) as a plain `background-image`. Both are already correct on a dark
card — the mask picks up whatever ink `colorForeground` was mapped to.

**Why:** the `dark` base theme in `@clerk/themes` still carries image-era
`providerIcon__apple` / `__github` / `__vercel` / `__okx_wallet`
`filter: invert(1)` rules. Against a mask fill that inversion flips a light ink to
near-black, so those marks vanish on a dark card; a compensating
`brightness(0) invert(1)` then hides the problem by forcing every mark to flat
white — off-token, and it flattens the colour ones to a blob.

**How to apply:** set `socialButtonsProviderIcon: { filter: "none" }` and let the
mask fill do the work. An appearance override on the GENERIC key beats the base
theme's per-provider key, so one rule neutralises them all. Verify by sampling the
brightest painted pixel inside the icon's rect from a raw screenshot buffer — the
computed `background-color` reads correct even while a filter paints the opposite.

## Verification notes
- Measure RENDERED pixels (screenshot + raw buffer), not just the computed value
  of the variable: the variable can be correct while the painted result is
  invisible.
- Park the mouse far from the control before measuring "rest" — hovering ramps
  the border alpha from ~11% to ~28% and silently inflates the reading.
- Chromium matches `:focus-visible` on text inputs even for mouse clicks, so a
  global `:focus-visible` outline rule already covers Clerk's fields; there is no
  need to map a focus-ring variable to get an on-brand focus indicator.
