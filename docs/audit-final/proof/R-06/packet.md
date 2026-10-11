# R-06 — Saved learning profile chips omit available time
Commit: dev `ab6da9f940ae994a308857bdc7b44918699fa853+workspace` (fix in the working tree on top of ab6da9f9)   Persona: member1 (`__qa_test_final_member1_*`, saved time "One focused session each week")   Browser: Chromium 1440, Firefox 375
System/accent/width: editorial/crimson; 1440 and 375

**Status: CONFIRMED** (FIXED, independently reviewed).

## Reproduction steps
1. Sign in as a member who has saved learning preferences. In Settings → Learning preferences, note the "Available time" choice.
2. Open `http://127.0.0.1:5000/recommendations`.
3. Read the card "Using your saved learning profile". The description says the results use "your saved topics, goals, formats, skill level, and available time". Compare that with the chips below it.

## Before — what was seen
- `../R-01/after-recommendations-member-chromium-1440.png` (captured during R-01 on ab6da9f9)
  1. Shows: the card with chips INTERMEDIATE · COMMUNITY & EVENTS · LEARN THE FUNDAMENTALS · VIDEOS.
  2. Proves: no chip for available time, although the sentence above names it.
  3. If fixed: a fifth chip with the saved time label.
  4. Unexpected: none beyond this row.

## Root cause
`client/src/components/ui/ai-recommendations-panel.tsx` built chips for skill, categories, goals and formats from `effectiveProfile`, but never rendered `effectiveProfile.timeCommitment`, which the same component already reads (it's sent with the generation request).

## Fix
The panel imports `TIME_COMMITMENT_OPTIONS` (the single label source the Settings and onboarding radios use) and renders the saved choice's label as an outline chip (`data-testid="active-preference-time"`) after the format chips.

## After — what was seen
- `after-chips-firefox-375.png`
  1. Shows: the same card at 375 with five chips. The last one is "ONE FOCUSED SESSION EACH WEEK".
  2. Proves: the chip text equals the saved Settings choice. The caption reads `saved time="One focused session each week"` and lists the chip text.
  3. If broken: four chips, or a raw value such as "weekly".
  4. Unexpected: the skill chip shows the stored value `intermediate` (uppercased by CSS), while the others show labels. It reads correctly, so this isn't logged as a row.
- `after-chips-chromium-1440.png`: the same five chips at 1440. Nothing unexpected.
- Network: each load made one `POST /api/recommendations?limit=10` (200). member1's recommendations were already generated in R-01, so this is the normal page load and not `refresh=true`. No console errors. Data: `capture-log.jsonl`.

## Unexpected items → new rows
None.

## Reviewer verdict
**CONFIRMED** by independent reviewer `review-batch1` (own persona `__qa_test_final_review_final_r07_…` where sign-in was needed), revision `2349a26c27f732e515acdfafdf042c7f4e9b25cc+workspace`, 2026-10-11. The reviewer captured first and read this packet afterwards.
- Seen: Settings saved “A little most days”; the recommendations profile displays the matching time chip at 1440 and 375. Chips and surrounding controls fit without overflow.
- Compared with this packet: Same outcome; independently used daily rather than weekly time, and Chromium rather than Firefox at 375.
- Reviewer evidence: `review/review-available-time.png`, `review/review-1440-profile.png`, `review/review-375-profile.png`, `review/review-measurements.jsonl`
