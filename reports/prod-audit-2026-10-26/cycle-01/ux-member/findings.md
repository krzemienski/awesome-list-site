# ux-member findings — live https://awesome.video, rev 229f004d (start 09:56:07Z, end 10:30:51Z UTC; /api/version matched at both)

Account: owner (admin role, password session `av_admin_session`), acting as a member. Tool: agent-browser session `ux-member` (cookie loaded without printing it). The owner was never signed out.
Verdict: ISSUES (2 Medium/Low product findings, 1 Low copy finding; no console errors, no horizontal scroll, no target-size failures).

| id | sev | page | width | saw | expected | evidence | likely source |
|---|---|---|---|---|---|---|---|
| MB-01 | Medium | /profile?tab=security | 1440 | "Manage account security" is enabled; clicking it (twice) does nothing: no modal, no toast, no console message. In the page, `window.Clerk.loaded=true` and `Clerk.user=null` (the owner session is the password cookie, not Clerk), so `clerk.openUserProfile()` silently no-ops. A false affordance on the Security tab. | Disable or hide it with an explanation ("This account signs in with the admin password…") when there is no Clerk user, or open something that works. | p-profile-manage-security-click-1440.png (unchanged page after click); eval `{clerk:"object",loaded:true,user:false}` | client/src/components/profile/AccountSecurityCard.tsx:41-47 (disabled only on `!loaded \|\| !clerk`) |
| MB-02 | Low | /settings (Notifications card) | 1440 | "Pause for 7 days" and "Resume now" persisted `timezone: "America/New_York"` although the user never set one (baseline `null`). The value can't go back to null through the UI or the API (schema min(1)). | Quick actions change only their own field, as the code comment says ("Quick actions change only their own fields"). | GET /api/notification-preferences before (timezone null) and after (America/New_York); PUT ×2 200 | client/src/components/notifications/NotificationPreferencesCard.tsx:116 (`timezone: data.timezone ?? localTimezone()` in `savedValues`, then the quick action sends `{...savedValues, ...patch}` at :185) |
| MB-03 | Low (copy) | /journeys vs /continue-learning | all | Enrolled journeys at 0% (9, 10, 8) show "Start Journey" on /journeys, while /continue-learning lists the same journeys under "Resume a journey" with "Resume next step". | One label for one state (e.g. "Continue Journey" or "Resume" once enrolled). | j-journeys-1440.png, cl-continue-learning-1440.png; card CTA eval `{id:9,cta:"Start Journey",prog:0}` | client/src/pages/Journeys.tsx:495-504 (label keyed on progress>0, not enrollment) |

## PASS (driven, evidence in this dir)
- Account menu (1440): Profile, Bookmarks, Notifications, Settings, Theme Settings, Admin each land on the right page; items are 214×44. d-account-menu-1440.png
- /profile: header, stats (2 favorites, 12 bookmarks = lists), tabs (URL ?tab=, ArrowRight moves and activates), Favorites/Bookmarks/Submissions/Security panels. Edit name: blank → "Enter at least a first or last name.", no PATCH; Cancel returns focus to the pencil. Deletion dialog opens with focus on Cancel; Cancel returns focus, no request, deletionRequestedAt null.
- /settings: all sections render. Learning prefs with 0 topics → "Choose at least one topic", no PUT. Invalid tz → "Choose a valid IANA time zone." + aria-invalid, no PUT. Home layout Index→Curated persists (home renders curated) → Index. Reset dialog: Escape closes, focus back on the trigger. #notification-settings deep link scrolls. Tab order logical, every stop has a ring.
- /settings/theme: Geist pick saves to account ("Theme saved to your account."), persists across reload, and re-applies from the account with localStorage cleared; arrow keys move and select (roving). Restored to Editorial × Crimson (verified via GET).
- /bookmarks: tiles 12/13 match cards and the "All saved" count; create collection (whitespace-only name keeps Create disabled), add via the detail dialog, note save shown on card and detail, remove from collection via detail Edit, rename (Enter submits), delete (bookmarks preserved), card Remove → DELETE, focus moves to the next card.
- Resource detail: Favorite on/off (toast, aria-pressed, /profile list); Bookmark dialog; Share → "Link copied" toast; Report broken link dialog opens with focus on the note, Cancel returns focus, no request; Suggest Edit validation (title required, https-only new URL, description ≥10), Cancel, no /edits request.
- /submit: empty submit → 4 inline errors, focus on title, toast, no POST; draft restored after reload ("Draft restored"); Cancel → discard dialog (Keep editing keeps values; Discard clears the draft and goes to /). Server rejects reserved test domains (400, inline message on URL, focus on URL); that is correct behaviour.
- /contributions: 21 total = 3+18; Pending filter → "No contributions match" + Clear filters (resets URL, focus to search); pagination present.
- /journeys + /journey/9: Mark step 1 complete → 17%, toast, focus to Undo, persists across reload; Undo → 0%. /continue-learning Resume → /journey/9#step-1, focus on step-1, no progress write.
- /recommendations: personalized; Helpful toggle on → toast/aria-pressed → off; server feedback [] before and after.
- /notifications: empty state + "Review notification choices" → /settings#notification-settings.
- Hard reload of all 10 member pages stays signed in (no sign-in redirect, correct h1).
- No page errors or console errors/warnings on 12 member pages (capture checked with a probe message).
- No horizontal scroll at 390/820/1440 on 13 pages. Every button/tab/radio/checkbox ≥44px at 390/820 (bookmark checkboxes are 20px inside 44×44 labels); the feedback buttons and pager are 36/32px only at ≥1025px by design (pointer widths).
- prefers-reduced-motion: no running animations, no transitions >50ms on 4 pages.
- Contrast: probe flags were artifacts (light text 244,243,238 on near-black; probe misread a 2.4%-alpha tint). No confirmed failure.

- /submit (lead's URL github.com/krzemienski/awesome-list-site/issues/42): POST 201 → id 190349 PENDING in /contributions → Withdraw dialog → WITHDRAWN (toast, focus on card) → admin DELETE 200 → GET 404; contributions back to baseline. Evidence: c-contributions-pending-1440.png, c-contributions-withdrawn-1440.png.

## UNVERIFIED
- True touch input (pointer:coarse / hover:none): agent-browser device/viewport emulation reports `hover:hover`, `pointer:fine`, so hover-only-at-rest under touch is not proven. Screenshots show card actions visible at rest.
- Bookmark add/remove toasts ("Added to bookmarks", "Bookmark removed" + Undo): not seen when read 1.2–2.5 s after the action; requests and state were correct. Undo not exercised.
- MB-01 for an ordinary Clerk-signed-in member (only the owner password session was available).
- Collection Publish link / Copy / Unpublish / Archive, bulk actions, API key create/revoke, Unsubscribe all: not exercised (avoid public links and secrets on the owner account).

## Auditor incident
- I accidentally renamed the owner to "Admi Use" (select-all keystrokes didn't clear the fields), restored to "Admin User" at 10:01:52Z within ~1 min. See created-rows.md.
