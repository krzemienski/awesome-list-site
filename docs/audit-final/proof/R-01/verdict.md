# R-01 independent review

Reviewer: **review-r01**

Revision observed from `/api/version`: **ab6da9f940ae994a308857bdc7b44918699fa853+workspace**. This is the requested commit with the server-reported workspace suffix; this review does not certify a clean working tree.

Own member personas (retained for teardown):
- Settings: `__qa_test_final_review_r01_1791746928768@example.com`
- Initially fresh onboarding: `__qa_test_final_review_r01b_1791746933183@example.com`

Environment: local `http://127.0.0.1:5000`, editorial/crimson, height 900. Desktop pointer clicks; 375px Chromium and Firefox touch-enabled taps. Arrow keys were held for 120ms using down/wait/up. Scripts only captured observations and did not contain assertions or pass/fail decisions. No application files were edited, no server/workflow was started or restarted.

## Readings

All numbers below are `window.scrollY` in pixels. The captured scrolling-element top matched windowY throughout, with bodyTop 0. The value arrows are literal checked-radio `value` attributes.

| Settings cell | Advanced pointer: Y before→after; value before→after | Held ArrowLeft: Y; value | Daily pointer: Y; value | Held ArrowDown: Y; value | PUT `/api/user/preferences` | After reload skill / time |
|---|---|---|---|---|---|---|
| Chromium 1440 | 810→810; beginner→advanced | 810→810; advanced→intermediate | 1866→1866; flexible→daily | 1866→1866; daily→weekly | 200 | intermediate / weekly |
| Chromium 375 touch | 1319→1319; intermediate→advanced | 1319→1319; advanced→intermediate | 3390→3390; weekly→daily | 3390→3390; daily→weekly | 200 | intermediate / weekly |
| Firefox 375 touch | 1339→1339; intermediate→advanced | 1339→1339; advanced→intermediate | 3410→3410; weekly→daily | 3410→3410; daily→weekly | 200 | intermediate / weekly |
| Firefox 1440 | 810→810; intermediate→advanced | 810→810; advanced→intermediate | 1823→1823; weekly→daily | 1823→1823; daily→weekly | 200 | intermediate / weekly |

The same Settings persona was deliberately used serially, so later cells began with its previously saved intermediate/weekly profile. In the first completed flow, Community & Events, Learn the fundamentals, and Videos were checked before Save. Subsequent cells retained those selections.

| Onboarding cell / action | Y before→after | Value before→after / selection | PUT status | Settings after final Save |
|---|---|---|---|---|
| Chromium 375 touch, initial fresh-account step 1 | 0→0 | beginner→advanced | — | — |
| Step 2 | 29 at capture | Community & Events checked | Continue sends draft PUTs | — |
| Step 3 | 0 at capture | Learn the fundamentals checked | Continue sends draft PUTs | — |
| Step 4 | 0 at capture | Videos checked | Continue sends draft PUTs | — |
| Step 5 daily card, initial run and completed run | 0→0 | flexible→daily | — | — |
| Resumed step 1 in completed run | 0→0 | advanced→advanced | — | — |
| Final Save preferences | — | advanced / daily | 200 | advanced / daily |

**Capture-harness disclosure:** The first cold onboarding run used the fresh second account and captured beginner→advanced and flexible→daily, then stopped before final Save to discover the exact button label. Reopening `/onboarding` resumed the server-saved draft at step 5. I used Back to revisit step 1. One retry toggled the already-checked Topic off and could not continue; the final retry preserved checked choices and completed Save. The append-only log retains every attempt. The final retry overwrote the same-named step images: the step-1 images therefore show the resumed advanced selection, not the original beginner state. The original cold beginner→advanced reading is in the log at 19:31:12Z. This is an evidence limitation, not a fabricated fresh rerun. There was no prior saved profile when that account first entered onboarding.

| Recommendations cell | `[role=combobox], select` count | Page observed |
|---|---|---|
| Chromium guest 1440 | 0 | Recommended Resources, popular catalog picks, sign-in invitation |
| Firefox guest 1440 | 0 | Same guest surface |
| WebKit guest 1440 | 0 | Same guest surface |
| Chromium member 1440 | 0 | Personalized Recommendations, saved-profile chips, Edit learning preferences |

## Images personally opened and inspected

All paths below are relative to this directory. Burned-in captions identify URL, engine, width, persona, theme, timestamp and captured readings; the full numeric records are in `capture-log.jsonl`. On narrow images long captions wrap and truncate some JSON, so the log supplements rather than replaces the visible selected radio.

| Image | What it shows |
|---|---|
| `review-initial.png` | Fresh Settings profile says No learning preferences saved and offers Choose preferences. |
| `review-chromium-1440-start.png` | Skill cards with Beginner initially checked at Y810. |
| `review-chromium-1440-skill-click.png` | Advanced checked after click without viewport movement. |
| `review-chromium-1440-skill-key.png` | Intermediate checked and focused after held ArrowLeft. |
| `review-chromium-1440-time-click.png` | A little most days checked at unchanged Y1866. |
| `review-chromium-1440-time-key.png` | One focused session each week checked after ArrowDown. |
| `review-chromium-1440-save.png` | Learning preferences saved toast and captured PUT200. |
| `review-chromium-1440-reload-skill.png` | Intermediate remains selected after reload; Topic is checked. |
| `review-chromium-1440-reload-time.png` | Weekly remains selected after reload. |
| `review-chromium-375-start.png` | Mobile skill cards with Intermediate initially checked at Y1319. |
| `review-chromium-375-skill-click.png` | Advanced checked after tap in the same mobile viewport. |
| `review-chromium-375-skill-key.png` | Intermediate checked and focused after ArrowLeft. |
| `review-chromium-375-time-click.png` | Daily checked at unchanged Y3390. |
| `review-chromium-375-time-key.png` | Weekly checked and focused after ArrowDown. |
| `review-chromium-375-save.png` | Saved toast and PUT200 caption on mobile. |
| `review-chromium-375-reload-skill.png` | Intermediate remains checked after reload. |
| `review-chromium-375-reload-time.png` | Weekly remains checked after reload. |
| `review-firefox-375-start.png` | Firefox mobile skill cards with Intermediate at Y1339. |
| `review-firefox-375-skill-click.png` | Advanced checked after tap with the same viewport. |
| `review-firefox-375-skill-key.png` | Intermediate checked after held ArrowLeft. |
| `review-firefox-375-time-click.png` | Daily checked at unchanged Y3410. |
| `review-firefox-375-time-key.png` | Weekly checked after held ArrowDown. |
| `review-firefox-375-save.png` | Saved toast with captured PUT200. |
| `review-firefox-375-reload-skill.png` | Intermediate survives reload in Firefox mobile. |
| `review-firefox-375-reload-time.png` | Weekly survives reload in Firefox mobile. |
| `review-firefox-1440-start.png` | Desktop Firefox skill cards with Intermediate at Y810. |
| `review-firefox-1440-skill-click.png` | Advanced checked after click without jumping up. |
| `review-firefox-1440-skill-key.png` | Intermediate checked after ArrowLeft without scrolling. |
| `review-firefox-1440-time-click.png` | Daily checked at unchanged Y1823. |
| `review-firefox-1440-time-key.png` | Weekly checked after ArrowDown at the same position. |
| `review-firefox-1440-save.png` | Saved toast and PUT200 caption. |
| `review-firefox-1440-reload-skill.png` | Intermediate survives desktop Firefox reload. |
| `review-firefox-1440-reload-time.png` | Weekly survives desktop Firefox reload. |
| `review-onboarding-1-before.png` | Resumed draft at step 1 with Advanced already checked; consent appears above header. |
| `review-onboarding-1-after.png` | Advanced still checked after tapping its card, Y0 unchanged. |
| `review-onboarding-2.png` | Community & Events checked on step 2. |
| `review-onboarding-3.png` | Learn the fundamentals checked on step 3. |
| `review-onboarding-4.png` | Videos checked on step 4. |
| `review-onboarding-5-before.png` | Flexible/Whenever time allows checked before the time tap. |
| `review-onboarding-5-after.png` | Daily/A little most days checked after tap, Y0 unchanged. |
| `review-onboarding-save.png` | Your learning profile is ready; PUT200 caption; primary CTA label visibly clipped. |
| `review-onboarding-settings-skill.png` | Settings shows Advanced from the completed onboarding profile. |
| `review-onboarding-settings-time.png` | Settings shows Daily from the completed onboarding profile. |
| `review-recommendations-chromium-guest.png` | Chromium guest resource cards, count0 caption, no preference dropdowns. |
| `review-recommendations-firefox-guest.png` | Firefox guest resource cards, count0 caption. |
| `review-recommendations-webkit-guest.png` | WebKit guest resource cards, count0 caption. |
| `review-recommendations-chromium-member.png` | Member saved-profile chips and edit link, count0 caption; no time chip. |

Recording: `review-chromium-1440-settings.webm` is the completed Settings flow through reload. `review-chromium-1440-aborted-settings.webm` is the earlier harness attempt that stopped on an ambiguous Topic text locator; it is not relied on for completion.

## Console observations

Completed cells had no application console errors or pageerrors beyond the explicitly excluded Clerk notices:
- Clerk's “loaded with development keys” warning occurred in all engines; twice in flows that reloaded/navigated.
- Firefox reported `Cookie “_cfuvid” has been rejected for invalid domain` from the Clerk environment request in both Settings widths and guest Recommendations.

Those warnings/notices remain listed in the JSONL rather than silently discarded. The full local API response/status observations are also retained there.

## Unexpected observations / candidate backlog rows

1. **Mobile onboarding completion CTA clips its text.** In `review-onboarding-save.png`, the pink “See personalized recommendations” label overruns/clips at the right edge of its button at 375px. Candidate: wrap/fit the completion CTA label on narrow screens. This was not called out in the builder packet.
2. **Available time is absent from the member profile summary.** The copy explicitly says the profile uses available time, but only INTERMEDIATE, COMMUNITY & EVENTS, LEARN THE FUNDAMENTALS, VIDEOS are shown. Candidate: include the time chip or clarify this is a partial summary. This agrees with the packet's proposed R-06.
3. **Consent location differs on mobile onboarding.** It sits above the header in the onboarding images, while the Settings flow does not have that same above-header arrangement. Candidate: check intentional placement and consistency; the packet already identifies this under A-04. It did not prevent the selections.

Harness-only surprises are not app backlog findings: ambiguous duplicate Topic text; resuming a persisted onboarding draft; an already-selected checkbox being toggled off during the retry; captions covering the lower portion of narrow frames. The underscore QA avatar is explained by the intentionally underscore-prefixed addresses.

## VERDICT: CONFIRMED

The builder's **NOT-REPRODUCED on current code** conclusion is confirmed: all four independently captured Settings cells selected the expected cards by pointer/tap and 120ms-held keyboard arrows without changing scrollY, all four PUTs returned 200, and reload retained intermediate/weekly. Onboarding's initially fresh account selected skill/time without movement and ultimately showed advanced/daily in Settings; the retry/image limitation is disclosed above. The independently captured four Recommendations cells had zero combobox/select elements and visibly used cards/profile-edit links instead. I read the builder packet only after completing the prescribed capture set and inspected every referenced image. Its current behavioral claims agree with my observations; absolute Y coordinates and onboarding time values differ because I selected daily rather than its weekly example. I did not reproduce its additional Chromium1440/Firefox375 onboarding cells, guest-onboarding redirect, historical pre-replacement Select behavior, source-history root-cause attribution, zero-length-keypress experiment, or signed-in Safari/HTTPS behavior, so those are not independently endorsed. Its phrase “all six cells” for Recommendations is inconsistent with the four engine/persona combinations it enumerates; my evidence covers the four requested combinations, not six. The clipped mobile completion CTA is an additional candidate finding, but not the reported scroll-to-top regression.
