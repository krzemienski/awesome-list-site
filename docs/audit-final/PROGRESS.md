# Audit-final progress

Spec: `attached_assets/Pasted--deployment-model-claude-opus-5-5-effort-max-max-tokens_1791745317065.txt` (proof protocol, seed backlog).
Backlog: [BACKLOG.md](BACKLOG.md). Packets: `proof/<ID>/packet.md`.

## Standing decisions (spec defaults, applied on the owner's behalf)
1. No paid AI runs. Rows that need one stop at the confirm dialog and become `BLOCKED-PAID`.
2. Featured is hidden when it has 0 items (decision 3).
3. Header deviations are kept (decision 4).
4. Closing PRs/issues, publishing, and any production write that is not net-zero wait for written owner confirmation.
5. The frozen reference roots (`awesome-list-site-ds/`, `awesome-list-site-ds-20260929/`, `client/public/ds/*`) are never edited.

## Capture environment
- Captures run from `/tmp/af/` (capture-only scripts: navigate, click, read, screenshot; no assertions), then the evidence is copied here after the last capture of a session, because repo writes reload open Vite pages.
- Revision: `/api/version` in development now reports the checked-out `.git` HEAD as `<sha>+workspace` when no build revision is baked in.
- Browsers: Playwright from `@playwright/test` (the package matching the cached browser revisions). Chromium and Firefox run normally. WebKit launches with the Nix WebKitGTK runtime but **cannot hold a Clerk session over http** (dev cookies are `Secure`/`SameSite=None`; carrying the real session over as Lax was tried and the app still saw an anonymous user), so WebKit is used for guest pages only. The https dev domain routes to the design-system artifact, not the app.
- Personas: Clerk users `__qa_test_final_<label>_<ts>@example.com`, signed in with a backend sign-in ticket. All are torn down at the end (Clerk first, then local rows).
- Proof media are excluded from the publish image (`docs/audit-final/proof` is in the publish trimmer's target list).

## Log
| When (UTC) | Row | Change |
|---|---|---|
| 2026-10-11 19:14 | R-01 | BEFORE captures: Settings radio cards, Chromium + Firefox at 1440/375; no scroll jump. |
| 2026-10-11 19:23 | R-01 | Recordings: Settings (click, touch tap, held-arrow keyboard, save, reload) and member onboarding steps 1 and 5 → Settings. Status NOT-REPRODUCED, awaiting reviewer. |
| 2026-10-11 19:40 | R-01 | Reviewer review-r01 CONFIRMED NOT-REPRODUCED on ab6da9f9; packet wording on /recommendations cells corrected; new row R-07 (clipped onboarding CTA at 375). |
| 2026-10-11 19:45 | N-01 | Dev + prod sweeps: nav, /categories, home, "Resources (N)" and rendered cards equal SQL for all 9 categories (dev 1,816, prod 3,824, 0 orphans). NOT-REPRODUCED, reviewer review-n01 running. New rows N-12, N-13. |
| 2026-10-11 19:58 | N-01 | Reviewer review-n01 CONFIRMED NOT-REPRODUCED (dev + prod); packet step 2 corrected (no sidebar on /categories). |
| 2026-10-11 19:58 | R-07 | BEFORE: CTA overflows at 375 in all 5 systems × Chromium/Firefox. Fix: completion actions wrap (DS `.btn` nowrap overridden in account.css). AFTER: fits everywhere, 768 unchanged. FIXED, awaiting reviewer. |
| 2026-10-11 19:58 | R-06 | Fix: time chip from TIME_COMMITMENT_OPTIONS. AFTER: "One focused session each week" chip at 1440/375. FIXED, awaiting reviewer. |
| 2026-10-11 19:58 | N-12 | Fix: "Uncategorized" tile applying the existing general filter. AFTER: tiles = badge in all 9 categories and under kind filters; pressed state verified in 5 systems. FIXED, awaiting reviewer. New row N-14. |
| 2026-10-11 19:58 | N-13 | Host identified (GitHub OG 429). BEFORE: empty/blurred frame on failed thumbnails. Fix in card + detail. AFTER waits for a real failure. |
| 2026-10-11 20:20 | N-14 | BEFORE (prod 26450e08): Players & Clients sidebar rows 330 vs badge 447, nested groups short too. Fix: Uncategorized rows at category and nested level linking to `?filter=general`. AFTER: sidebar sum = badge in all 9 categories and every nested group; navigation, reload, Back/Forward, 375 drawer in 2 systems. FIXED, awaiting reviewer. New rows N-15, D-12. |
| 2026-10-11 20:20 | N-15 | BEFORE: filtered subcategory shows no visible filter (prod 83 badge / 11 listed). Fix: scope narrows the visible count heading + removable scope chip. AFTER: "10 of 67 resources match" + chip at 1440/375 in 2 systems; chip removal, Back/Forward. FIXED, awaiting reviewer. |
| 2026-10-11 20:20 | D-12 | REPRODUCED at 375 in Editorial and Brutalist; fix pending. |
| 2026-10-11 20:25 | D-12 | Root cause: the inner navigation scrolled while the close button was anchored to the fixed drawer. Fix: the drawer itself scrolls, as the reference's `.mobile-drawer` does. AFTER: 0 counts under the X at 375/768 in Editorial and Brutalist, footer intact, deep-link reveal still works, focus returns. FIXED, awaiting reviewer. |
| 2026-10-11 20:40 | R-06, R-07, N-12, N-15, D-12 | Reviewer review-batch1 CONFIRMED all five on 2349a26c. |
| 2026-10-11 20:40 | N-14 | Reviewer REJECTED: two `aria-current=page` links on the nested filtered page. Root cause also affects every sub-subcategory page (prod 26450e08 shows it). Fix: the parent link is current only on its own unfiltered listing. AFTER2: one current link on 5 routes + drawer. Re-review requested. |
| 2026-10-11 20:40 | S-04 | Prod headers and secrets scan clean (packet pending). |
| 2026-10-11 20:40 | S-05 | npm audit: 3 critical, 26 high (prod tree 2/21). Remediation next. |
| 2026-10-11 20:50 | N-14 | Re-review CONFIRMED on 0f986c35. |
