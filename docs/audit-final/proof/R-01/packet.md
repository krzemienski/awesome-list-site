# R-01 — Issue #20: Skill level / Time commitment controls scroll the page instead of opening
Commit: `ab6da9f940ae994a308857bdc7b44918699fa853+workspace` (from `/api/version`, every capture)   Persona: member `__qa_test_final_member1_1791746041038@example.com`; fresh members `__qa_test_final_onb1/onb2/onb3_*` for onboarding; guest   Browser: Chromium, Firefox (Playwright, capture-only); WebKit for guest pages
System/accent/width: editorial/crimson; 1440 and 375 (375 Chromium with touch emulation)

**Status: NOT-REPRODUCED — CONFIRMED** by the independent reviewer on `ab6da9f9`.

## Reproduction steps
1. Sign in as a member. Open `http://127.0.0.1:5000/settings#learning-preferences`. If the section says "No learning preferences saved", press **Choose preferences**.
2. In DevTools Console run `scrollY`. Click the third Skill level card ("Advanced"). Run `scrollY` again.
3. Focus the checked Skill level card and hold ← for about 120 ms. Run `scrollY` again.
4. Scroll to **Available time**. Click "A little most days", then hold ↓. Run `scrollY` before and after each.
5. Tick one Topic, one Goal and one Format if none are ticked. Press **Save learning preferences**. In Network confirm `PUT /api/user/preferences` → 200. Reload, and check the same Skill level and Available time are selected.
6. Repeat 1–5 at 375 px with touch emulation (tap instead of click).
7. With a member who has never saved preferences, open `/onboarding`. On step 1 choose a skill card, continue through steps 2–4 (one choice each), choose a time card on step 5, and press Save. Open `/settings#learning-preferences` and check both values.
8. Open `/recommendations` as a guest and as a member. Run `document.querySelectorAll('[role=combobox], select').length`.

## Before — what was seen
Issue #20 (filed 2026-06-27) shows the old "Configure Your Preferences" card in `client/src/components/ui/ai-recommendations-panel.tsx`, where Skill Level and Time Commitment were Radix `Select`s (`trigger-skill-level`, at `59468161^`). That UI no longer exists. Commit `59468161` (2026-08-12) replaced it with the shared `LearningPreferencesForm` (`client/src/components/onboarding/learning-preferences-form.tsx:90` and `:269`, `RadioGroup` cards), used by Settings and the onboarding wizard. The panel now has no Select at all.

- `before-settings-chromium-1440.png`
  1. Shows: Settings → Learning preferences, lower half. Format checkboxes, the **Available time** radio cards with "Whenever time allows" selected (red ring and border), then Reset and Save.
  2. Proves: the caption JSON reads `skill:last before 690 after 690, checked` and `time:last before 1858 after 1858, checked`. The page did not move, and the clicked card is selected.
  3. If broken: `after` would read 0 (jump to top), or the card would stay unselected.
  4. Unexpected: the avatar shows "_" because the QA email starts with underscores (real addresses aren't affected, so no row). The consent banner sits over the bottom edge (expected for a new profile).
- `before-settings-firefox-375.png`: the same at 375 in Firefox. The time cards wrap to two lines cleanly; `1219→1219` and `3456→3456`. Failure would look the same as above. Nothing unexpected beyond the caption covering the lower part of the frame.
- `before-onboarding-nocontrols-*.png`: a guest at `/onboarding` is sent to `/sign-in?redirect_url=%2Fonboarding`. Onboarding is member-only, so the guest captures show no controls. That's by design, and the member onboarding captures are below.

## Root cause
None on the current code. The defect lived in the Radix `Select`s of the pre-2026-08-12 recommendations panel. Commit `59468161` replaced them with native-flow radio cards, which have no portal, no scroll lock and no listbox, so there's nothing that can scroll the page.

## After — what was seen
Captures: `after-settings-{skill,time,reload}-{chromium,firefox}-{1440,375}.png`, recordings `after-settings-*.webm`. Onboarding: `after-onboarding-{step1-open,skill,time,done,persisted}-*.png`, recordings `after-onboarding-*.webm`. `/recommendations`: `after-recommendations-*.png`. Raw readings: `capture-log.jsonl`.

| Cell | Pointer on skill (scrollY) | Held ← on skill | Pointer on time | Held ↓ on time | Saved → after reload |
|---|---|---|---|---|---|
| Chromium 1440 | same before/after | moves selection, same scrollY | same | moves selection, same | equal (PUT 200) |
| Chromium 375 touch | tap, same | same | tap, same | same | equal (PUT 200) |
| Firefox 1440 | same | same | same | same | equal (PUT 200) |
| Firefox 375 | same | same | same | same | equal (PUT 200) |
| Onboarding Chromium 1440 / Firefox 375 / Chromium 375 touch | step 1: 0→0 / 356→356 / 36→36 | – | step 5: 0→0 in all three | – | Settings shows advanced + weekly in all three |

- `after-settings-skill-chromium-375.png`
  1. Shows: Learning preferences at 375 (touch), Skill level cards with "Intermediate" selected.
  2. Proves: the caption reads `tap skill #3 y [1199,1199] skill advanced`, then `hold ArrowLeft y [1199,1199] skill intermediate`. Tap and keyboard both change the value with no scroll movement.
  3. If broken: the second `y` value would be 0, or the skill value wouldn't change.
  4. Unexpected: none beyond the caption overlay.
- `after-onboarding-time-firefox-375.png`
  1. Shows: onboarding "Step 5 of 5 · Time", "One focused session each week" selected.
  2. Proves: the caption reads `choose time #2 (step 5) y [0,0] value weekly`.
  3. If broken: the page would have moved, or no card would be selected.
  4. Unexpected: on mobile the consent banner renders above the header rather than at the bottom. It's left as is and checked in A-04.
- `after-onboarding-persisted-chromium-1440.png`: after finishing onboarding, Settings shows "One focused session each week" selected, and the caption reads `persisted {"skill":"advanced","time":"weekly"}`. If broken, Settings would show the default (flexible) or the empty state. Nothing unexpected.
- `after-recommendations-guest-webkit-1440.png` and `after-recommendations-member-chromium-1440.png`: the page #20 was filed on. Guest sees "Recommended Resources · Sign in to tailor them". Member sees "Using your saved learning profile" chips plus "Edit learning preferences". The caption reads `comboboxes=0` in all six cells: guest Chromium 1440, Firefox 375, WebKit 1440 and WebKit 375; member Chromium 1440 and 375. If broken, there would be Skill/Time `Select` triggers here.
  - Unexpected: the member profile chips (INTERMEDIATE · COMMUNITY & EVENTS · LEARN THE FUNDAMENTALS · VIDEOS) omit available time, while the copy says results use "skill level, and available time". This becomes new row **R-06**.

**Harness note (not a defect).** Playwright's zero-length `keyboard.press('ArrowLeft')` moved focus but not the selection in Chromium. Radix RadioGroup only checks a radio that receives focus while an arrow key is still held, and roving focus moves focus on a timer. With a 120 ms hold (a human keypress), selection follows focus in every Chromium cell (`kb` probe in the log).

**Not covered.** WebKit for the member-only Settings and onboarding pages: WebKit can't hold the Clerk dev session over http (cookies are `Secure`/`SameSite=None`; carrying the real session over as Lax was tried and the app still saw an anonymous user). WebKit is covered for the guest `/recommendations` page. The member surfaces should be rechecked in Safari on https://awesome.video after publish (P-02).

Console in every cell: no errors (Clerk's development-keys warning and Firefox's `_cfuvid` cookie notice from Clerk's domain are filtered and listed in the log).

## Reviewer verdict
**CONFIRMED** — reviewer `review-r01` (separate agent, did not touch the code), commit `ab6da9f940ae994a308857bdc7b44918699fa853+workspace`, own accounts `__qa_test_final_review_r01_1791746928768@example.com` (Settings) and `__qa_test_final_review_r01b_1791746933183@example.com` (fresh onboarding). Full verdict with per-cell readings: [verdict.md](verdict.md). Own images: `review-*.png`; recording `review-chromium-1440-settings.webm`.

Reviewer's comparison (summarised): in all four Settings cells (Chromium 1440, Chromium 375 touch, Firefox 375 touch, Firefox 1440), pointer/tap and 120 ms held arrows changed the selected card with scrollY unchanged (e.g. 810→810, 3390→3390). All four PUTs returned 200, and the values survived reload. A fresh onboarding account chose skill and time with scrollY 0→0, and Settings then showed advanced/daily. `/recommendations` had zero combobox/select elements in its four cells. The reviewer noted it did not independently reproduce the builder's extra onboarding cells, the guest-onboarding redirect, the historical Select behaviour, the commit attribution, the zero-length-keypress experiment, or signed-in Safari (that last one stays with P-02). It flagged the "all six cells" wording, which is now corrected above to list the six cells actually captured.

Disclosed reviewer evidence limitation: an onboarding retry resumed the server-saved draft and overwrote the step-1 images. The cold beginner→advanced reading remains in its append-only log (19:31:12Z).

New rows from the review: **R-07** (mobile onboarding completion button label clipped at 375, `review-onboarding-save.png`). R-06 (time chip missing) and the above-header consent banner (A-04) were also observed.
