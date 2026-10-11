# R-07 — Onboarding completion button clips its label at 375
Commit: dev `ab6da9f940ae994a308857bdc7b44918699fa853+workspace` (from `/api/version`; the fix is in the working tree on top of ab6da9f9)   Persona: fresh member per run (`__qa_test_final_r07*`)   Browser: Chromium + Firefox (Playwright, capture-only)
System/accent/width: all five systems at their default accents; 375 (touch) and 768

**Status: CONFIRMED** (FIXED, independently reviewed).

## Reproduction steps
1. Sign in as a brand-new member and open `http://127.0.0.1:5000/onboarding`.
2. Complete all five steps (any choices) and press **Save**. The "Your learning profile is ready" card appears; the URL stays `/onboarding?step=5`.
3. At 375 px wide, look at the first button, "See personalized recommendations".
4. Switch systems from the theme picker (or run `window.applyDesignSystem('<system>', window.SYSTEM_DEFAULT_ACCENT['<system>'])` in the console) and look again in each of the five systems. Repeat in Firefox and at 768.

## Before — what was seen
At 375, in both engines and all five systems, the label is wider than the button: it runs past both edges and the sparkle icon starts outside the button's left edge. At 768 the buttons sit side by side and fit.

| Engine · width | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|---|---|---|---|---|
| Chromium 375 (button / content px, icon offset) | 245/250, −6 | 245/266, −21 | 245/246, −2 | 243/257, −16 | 245/249, −4 |
| Firefox 375 | 245/266, −6 | 245/278, −18 | 245/262, −2 | 243/271, −14 | 245/264, −4 |
| Chromium 768 | fits | fits | fits | fits | fits |

- `before-complete-terminal-chromium-375.png`
  1. Shows: the completion card in Terminal at 375. The primary button's text "See personalized recommendations" runs past both side borders, and the sparkle icon sits left of the border.
  2. Proves: the clipping is real in the rendered page. The caption reads `CTA box 245px content 266px icon@-21 clipped=true`.
  3. If fixed: the label would wrap onto two lines inside the border, with the icon inside.
  4. Unexpected: the URL stays `?step=5` after a successful save. Reloading shows the step-5 form again with the saved values, which is acceptable (it is also how members edit). Not a defect.
- `before-complete-<system>-<engine>-375.png` (10 frames): the same overflow in every system and both engines, with each frame's caption giving its measurements.
- `before-complete-<system>-chromium-768.png` (5 frames): the two buttons side by side, both fitting.
- I missed this in my own R-01 frame `R-01/after-onboarding-done-chromium-375.png`, where the overflow is visible. Reviewer review-r01 caught it.

## Root cause
`client/public/ds/design-system.css` (frozen) gives `.btn` `white-space: nowrap`. On the completion card at 375 the actions stack to full width (245 px), and "See personalized recommendations" plus its icon needs 246–278 px depending on the system's font. The button can't wrap, so the text overflows. A Tailwind `whitespace-normal` utility would lose to the unlayered DS rule.

## Fix
- `client/src/pages/Onboarding.tsx`: the completion actions container gets the hook class `account-onboarding-actions`.
- `client/src/styles/pages/account.css`: an unlayered `.account-page .account-onboarding-actions .btn { white-space: normal; text-align: center; }`. Button heights come from `min-height` (44 px floor kept), so a wrapped label grows the button.

## After — what was seen
| Engine · width | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|---|---|---|---|---|
| Chromium 375 (button / content px, height) | 245/243, 62 | 245/243, 60 | 245/243, 60 | 243/239, 58 | 245/243, 60 |
| Firefox 375 | 245/243, 62 | 245/243, 60 | 245/243, 60 | 243/239, 58 | 245/243, 60 |
| Chromium 768 | unchanged (44 px) | unchanged | unchanged | unchanged | unchanged |

- `after-complete-brutalist-chromium-375.png`
  1. Shows: Brutalist at 375. "SEE PERSONALIZED RECOMMENDATIONS" wraps to two centred lines inside the amber button, with the icon inside on the left. "BROWSE THE CATALOG" is unchanged below it.
  2. Proves: the label fits. The caption reads `CTA box 243px content 239px icon@18 clipped=false h=58`.
  3. If broken: text would cross the border, or the button would stay 44 px high and cut off the second line.
  4. Unexpected: none.
- `after-complete-terminal-firefox-375.png`: Terminal in Firefox shows the same wrap inside the green border (`clipped=false h=60`). Nothing unexpected.
- The other `after-complete-*-375.png` frames show the same result for every system and engine. The `after-complete-*-768.png` frames are identical to their BEFORE frames: the buttons stay side by side at 44 px, so nothing regressed.
- Run data: `capture-log.jsonl` (phase `before` and `after`), capture script `capture-script.mjs`. There were no console errors and every preferences PUT returned 200.

## Unexpected items → new rows
None.

## Reviewer verdict
**CONFIRMED** by independent reviewer `review-batch1` (own persona `__qa_test_final_review_final_r07_…` where sign-in was needed), revision `2349a26c27f732e515acdfafdf042c7f4e9b25cc+workspace`, 2026-10-11. The reviewer captured first and read this packet afterwards.
- Seen: Completed five steps and saved; completion remained at /onboarding?step=5. All five systems fit at both widths: 375 labels wrap inside 58–62px-high buttons, while 768 buttons remain 44px high. Document width equals viewport width.
- Compared with this packet: Measurements agree; Firefox was not repeated.
- Reviewer evidence: `review/review-375-brutalist.png`, `review/review-375-terminal.png`, `review/review-768-brutalist.png`, `review/review-measurements.jsonl`
