# Task 568 — visitor and admin click-through

Acceptance record for the Phase 5 human-flow safety net. One consolidated
result; the detailed per-step log with artifact IDs, censuses and teardown is
[evidence/clickthrough/native-testing/clickthrough-2026-09-15.md](evidence/clickthrough/native-testing/clickthrough-2026-09-15.md).

## How it was run

- All interactive verification was driven with the built-in browser tester
  against `http://127.0.0.1:5000` (the app port; the public dev hostname
  serves the design-system artifact). Testers: `parity-admin-clickthrough`,
  `parity-admin-census`, `parity-visitor-keyboard`, `parity-visitor-census`,
  `parity-card-instances`, `parity-admin-subcats-375`, plus the first native visitor run in
  [native-testing/report.md](evidence/clickthrough/native-testing/report.md)
  (its admin blocker was resolved by the later runs; the header of that file
  says so).
- Identities: disposable, `__qa_test_568_` prefixed, created through Clerk
  and signed in via `/sign-in?__clerk_ticket=…`; the admin was promoted by a
  `[DB]` role update. The only catalog write was the one fixture resource,
  which was created, approved, verified public and deleted.
- Production received no writes; only the read-only visitor comparison in
  [production-visitor.md](evidence/clickthrough/production-visitor.md).
- Metric definitions. **Unexpected error response** = any HTTP status ≥ 400
  other than the two the app produces by design for an anonymous visitor:
  `401` on signed-in-only user endpoints (`/api/auth/user`, bookmarks,
  favorites, notifications) and `404` for a not-yet-approved resource (the
  pending fixture). **Console error** = `console.error` or an uncaught page
  error; warnings are reported separately and were only Clerk's
  development-key notice and Chrome's autocomplete hint on Clerk's inputs.

## Result

| Requirement | Result | Evidence |
|---|---|---|
| Visitor path home → category → subcategory → resource → search → tag → about → legal → sign-in at 375 and 1440 | PASS | per-step PNGs `evidence/clickthrough/local/visitor/<nn>-<step>-<width>.png` (19 frames); native artifact IDs in the detail file §3–§5 |
| Admin path: sign in → dashboard → all 18 tabs (15 canonical + Sub-subcategories, Digests, Journeys folded panels) at 1440 and 375 | PASS | `local/admin/<nn>-<tab>-1440.png` (20 frames; the Users frame was removed for PII, see Declared gaps); 375 artifact IDs per tab; per-tab census at both widths in the detail file §1 (375 Subcategories re-run with a settle gate: 23/23 · 4/4 · 0 · 2/2, `tc7meb`) |
| Per-screen control census (`button`, `a[href]`, `[role=button]`, `input`) with each safe control exercised | PASS — 9 visitor screens × 2 widths (79 control families) and 18 admin tabs × 2 widths; then every repeated per-card control on every card of every listing screen at both widths (415 instances per width, 830 in total, all bookmarks restored); 0 dead controls; externals inventoried, not activated | detail file §1, §5, §5a |
| Submit → approve → public → counts +1 → delete → baseline (net-zero) | PASS: home 1,816→1,817→1,816; Encoding & Codecs 333→334; Codecs 23→24; found in `/search`, header search, recent rail, `/resource/188380`; DB `approved` 1816 before and after, no audit/edit residue | `local/submission/` (2 frames) + detail file §2 |
| Request log / console over every run | 0 unexpected error responses; 0 console errors | detail file (per run) |
| Keyboard-only visitor pass at 1440 (Tab order, visible focus, palette/menu/drawer/dialog traps, Escape restores focus) | PASS, recorded as a frame sequence | `evidence/clickthrough/keyboard-desktop-final/keyboard-desktop/` (22 frames) + detail file §3 |
| Mobile flow at 375 uses the drawer and header search | PASS on every visitor screen and on `/admin` | `local/visitor/02-drawer-375.png`, detail file §4 |
| Production read-only comparison | route/status parity confirmed; 0 request failures | [production-visitor.md](evidence/clickthrough/production-visitor.md), `evidence/clickthrough/production/` |
| Teardown | 0 `__qa_test_` users (local and Clerk, this task's prefix), 0 `__qa_test_` resources, `approved = 1816`; stale `__qa_test_` Clerk residue from earlier runs purged, a concurrent worker's three parity identities left alone; re-verified after the `test:e2e` run (its own 20 leaked WebKit fixture identities removed) | detail file §6, `test-e2e/README.md` |
| `test:e2e` still green afterwards | Final run (after the spec/config stabilisation): **676 passed / 0 failed / 1 flaky / 38 skipped** at 3 workers across all five projects, 25.7 min, exit 0. The one flaky case is the Firefox axe helper-page `newPage` hang in the Task549 admin a11y sweep (passed on its single local retry, reported as flaky, never as clean). 38 skips = the declared WebKit/Mobile Safari-over-http Clerk-session skips (19 each after the admin sweep was split per width). Firefox/WebKit could not run at all before this task; `npm run test:e2e:browsers` now reproduces the browser install from a clean cache | [test-e2e/README.md](evidence/clickthrough/test-e2e/README.md) |

## Defects

**1 confirmed and fixed (2026-09-15, owning component only).** Browser Back
from a category listing never reached Home: the listing's URL-sync effect
re-ran on the popstate (its `location` dependency changed while the page was
still mounted) and, seeing the document at `/` instead of its own href,
`replaceState`d the category URL over the entry the user had just navigated
to (history stayed at 3 entries; a second Back landed on `about:blank`).
Found by the built-in tester on a Back after the category click, reproduced
in a one-shot Chromium probe, fixed in `client/src/pages/TaxonomyListing.tsx`
by skipping the sync while the document is not on the listing's own path
(percent-decoding and trailing-slash tolerant). Verified afterwards: Back →
Home in 125 ms, Forward → category, Next → `?page=2`, Back → category page 1
(Chromium + Firefox probe; tester re-run with zero console errors / failed
requests; `browse-categories.spec.ts` 35/35 on Chromium; `url-params-audit`
35/35). Record: [navigation-followup.md](evidence/clickthrough/native-testing/navigation-followup.md).

Otherwise none confirmed. Tester findings investigated and retracted, each with the
reason recorded in the detail file: fixture "missing" from category pages
(listing is grouped by subcategory, not newest-first); listing tag pills
"not navigating to /tag" (they are filter chips by design; detail-page chips
navigate); Account-menu ArrowDown
(pressed before Radix's focus frame); sign-in card "unreachable by Tab"
(traversal-counting error — the card is light DOM right after the sidebar);
Show/Hide password "no-op" (click on Clerk's hidden pre-identifier password
node; the real step was verified in
[password-followup.md](evidence/clickthrough/native-testing/password-followup.md));
computed `outline 0px` on a focused header control while the ring was
visible (transition mid-value; pixels authoritative).

Production-only observation retained from the reference pass: at 375 the
drawer stayed over the category content after drawer navigation once
(`production/03-category-recovered-375.png` shows the Escape recovery). It
did not reproduce locally in any native run; kept as a production note.

Notes handed to the orchestrator (shared-component decisions, not edited
here): the consent banner is Tab stop 36 on a fresh load; there is no route
focus manager, so focus rests on `body` after SPA navigation; the toast close
button is enabled only by `group-hover` (gated on `@media (hover: hover)`),
so on touch devices a toast can be dismissed only by swipe or auto-dismiss.

## Task-owner waiver (2026-09-15)

The task owner directed that all interactive verification be driven with the
built-in browser tester and that no capture or test scripts be added. Two
acceptance details cannot be met literally under that instruction, and the
owner explicitly waived them on 2026-09-15 (in-conversation decision,
recorded here as the acceptance record):

1. **Per-step PNG files at both widths for every native step.** The built-in
   tester cannot export image files, so native steps are evidenced by
   tester artifact ID in the detail file. The PNG sets that do exist
   (`local/{visitor,admin,submission}/`, `keyboard-desktop-final/`,
   `production/` — visitor at 375 and 1440; admin, submission and keyboard
   at 1440) were captured by the earlier harness before the built-in-only
   policy and are retained as-is. **Waived:** artifact IDs plus the retained
   PNGs are accepted as the screenshot evidence; no further PNGs are
   required.
2. **A per-control outcome row for every control on every screen.** The
   record uses a per-screen census (every `button`, `a[href]`,
   `[role=button]`, `input` counted per screen and width), exercises each
   distinct control family once per screen, and then replays every repeated
   per-card control instance (830 over both widths). Controls that were
   deliberately *not* activated are named in the detail file: off-origin /
   `target=_blank` links, auth provider buttons, and admin actions that
   would start jobs or mutate data (export, seed, clear, sync, link-check,
   role edits, discovery approve/reject). **Waived:** the census + family +
   per-card-instance coverage stands in for a row per anchor/button; the
   non-activated set is accepted as inventoried, not dead.

Also decided by the owner: the deleted Users-tab frame stays in the branch
history for now (rewrite deferred to the orchestrator before any publish;
see Declared gaps 3 for exactly which refs contain it), and `test:e2e` is to
be made runnable rather than waived — see the `test:e2e` row in Result and
Declared gaps.

## Declared gaps

1. **Native screenshots are referenced by artifact ID** — see waiver item 1.
2. **`test:e2e` is green only with one local retry.** Four full 3-worker
   runs on this host each produced a different one-to-three single-occurrence
   infrastructure flakes (disjoint sets; every one passed solo). The
   reproducible ones were fixed in the specs (lost Escape before the palette
   mounted, a category click landing on a re-rendering card, `/profile`
   navigation racing the SPA redirect, a 20-cell axe sweep exceeding 60 s);
   the remaining one — Firefox's `context.newPage()` for axe's helper page
   hanging or failing under load — is outside the specs, so
   `playwright.config.ts` now allows **one local retry** (CI already allowed
   two). The final run reports it as `1 flaky`, listed per test in
   `evidence/clickthrough/test-e2e/README.md`. The 38 Clerk-session admin
   skips on WebKit/Mobile Safari over http remain (WebKit drops Clerk's
   `SameSite=None` dev cookies; production is https). No component was edited
   for the suite; the one component edit in this task is the Back-navigation
   fix under Defects.
3. **`local/admin/11-users-1440.png` removed for PII.** The Users tab frame
   showed a real account holder's name beside the masked email, so it was
   deleted from the evidence set (admin PNGs: 20 frames; the tab is
   evidenced by native artifact IDs). The frame remains reachable in this
   branch's commit history, and that history is also present on the
   platform's automatic `gitsafe-backup` ref; it is **not** on the GitHub
   `origin` remote. The owner assigned the history rewrite (and the backup
   ref's rotation) to the orchestrator before the branch is published; it
   was not attempted here because rewriting `main` in a task environment
   while other parity workers rebase onto it would break their merges.

## Retained evidence layout

```
docs/parity/evidence/clickthrough/
  native-testing/clickthrough-2026-09-15.md   step log, censuses, teardown (this run)
  native-testing/report.md                     first native run (visitor PASS; admin blocker superseded)
  native-testing/password-followup.md          Clerk password step verification
  local/{visitor,admin,keyboard,submission}/   per-step PNGs, 375 + 1440
  keyboard-desktop-final/keyboard-desktop/     keyboard frame sequence, 1440
  production/ + production-visitor.md          read-only production reference
  external-link-review/                        read-only GET review of external links
  browser-prerequisites/, test-e2e-output.txt  test:e2e blocker record (pre-fix)
  test-e2e/                                    test:e2e run after the fix: README, summary JSON, trimmed log, solo reruns
```
