**Verdict: ISSUES, with open gaps.** I drove most of the admin shell rows and a subset of the accessibility rows. I did not complete the lane (63 rows). Production stayed at `bc1797b065c1989ab92f512633f69bf3fe25e718` from 18:49 to 19:52 UTC, so no row needs re-driving for a revision change.

Evidence is in `reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L03/`: 68 files, screenshots plus raw `L03pub-AX-*.txt` and `L03-AX-*.txt` dumps. A few rows have no raw dump because I only recorded them in session; the matrix says which.

## Findings

| id | sev | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|---|
| T6-03-01 | Med | `/category/*` cards | 1440/390 (820 not walked) | Tab walk: card "View details" and tag-pill links (`Filter by tag …`) take focus with no visible indicator. The element has `outline: none`, and the card has a 3px outline width with style `none`. One tag pill did show a ring in a screenshot, so focus-visible styling is inconsistent. 22 of 180 stops had no ring. Expected a visible ring on every stop. | `L03pub-AX-007-tabwalk.txt`, `AX-007-focus-viewdetails-1440.png`, `AX-007-focus-tag-1440.png` | not located |
| T6-03-02 | Med | `/admin#approvals` | 1440/820/390 | Bulk-select checkboxes are 16x16 (`Select all pending resources`, `Select <name>`). Expected at least 24px, or 44px on touch. | `L03-AX-010-admin-targets.txt` | admin approvals table |
| T6-03-03 | Med | `/admin#resources` | 820/390 | Row checkboxes are 32x32. Expected at least 44px on touch. | `L03-AX-010-admin-targets.txt` | not located |
| T6-03-04 | Low | `/admin#researcher` | all | `research-brief-auto` and `research-brief-custom` radios are 16x16. | `L03-AX-010-admin-targets.txt` | not located |
| T6-03-05 | Med | `/admin#researcher` | all | 104 buttons are named only "Approve" or "Reject", 52 each, with no resource name. The table rows are `row-research-discovery-*`. The Discoveries panel does name its buttons, e.g. "Approve discovery: …". Expected names that include the discovery. | `L03-AX-019-admin-names.txt`, `AX-019-researcher-approve-1440.png` | `ResearcherTab.tsx` |
| T6-03-06 | Low | `/admin#linkhealth`, `/admin#edits` | 1440 and touch | Links 16px to 28px tall. Edits links are 257x21; Link Health URL links are 28px tall. | `L03-AX-010-admin-targets.txt` | not located |
| T6-03-07 | Low | `/` | 1440 | Home "+ N more →" links are 414x19. Nearest controls are 15.6px away, so the spacing exception probably does not hold. | `L03pub-AX-010-targets.txt`, `AX-010-home-more-link-1440.png` | `.home-subcategory-more` |
| T6-03-08 | Low | `/submit`, `/sign-in` | all | Inline "log in" link is 31x15, and "Use phone" is 62x16 at 1440. Both are inline links in running text, so they may be exempt under the brief's rule. | `L03pub-AX-010-targets.txt` | not located |
| T6-03-09 | Med | `/admin` | 1440 | Home page: the sidebar "Admin" item is hidden in a collapsed "More" `<details>` menu, so it is not a visible sidebar link. SH-02 passes only after opening "More". | `SH-02-more-open-1440.png` | `AppSidebar.tsx:1215` |
| T6-03-10 | Low | all pages | 390/820 | Reduced motion is not honored by the smooth-scroll code. With `prefers-reduced-motion: reduce`, the admin tab arrow scroll still ran at `behavior: smooth` (scrollLeft stepped 428 over about 400 ms in the baseline run). Under reduce, the first sample read 428 and held, so it did not animate in that run. I could not confirm the difference, so treat this as unproven. | `L03pub-AX-012-reduced-motion.txt` | `AdminDashboard.tsx:213` |
| T6-03-11 | Low | `/category/*` | 1440 | A single `<footer class="app-footer">` has no `aria-label`. The footer landmark is unlabelled. | `L03pub-AX-001-landmarks.txt` | `AppFooter.tsx:55` |
| T6-03-12 | Low | `/resource/186450#related-topics-heading` | all | Focus lands on a different heading (`#resource-onward-heading`) because that id does not exist on resource pages. It exists only on `TagLanding.tsx:271`. The row's "including `#related-topics-heading`" is satisfied on tag pages only. | `L03pub-AX-003-direct.txt` | `TagLanding.tsx:271` |
| T6-03-13 | Low | `/tag/ffmpeg` | 390 | Back from a destination page lands on BODY, not on the fragment target. | `AX-004-forward-390.png` | not located |
| T6-03-14 | Low | `/admin` | 390 | A right gutter of about 6px (document 384px against viewport 390px) appears on admin, `/about` and `/submit`. It is site-wide, not admin-only. | not saved | not located |

## Row matrix

C6-AX rows:

| id | verdict | widths driven | evidence |
|---|---|---|---|
| C6-AX-001 | PASS | 1440/820/390 | `L03pub-AX-001-landmarks.txt`, `AX-001-skip-focus-1440.png` |
| C6-AX-002 | PASS | 1440/820/390 | `L03pub-AX-002-first-load.txt` |
| C6-AX-003 | FAIL | 1440/820/390 | `L03pub-AX-003-direct.txt`, `L03pub-AX-003-tag.txt` |
| C6-AX-004 | FAIL | 390 only | `AX-004-forward-390.png` |
| C6-AX-005 | PASS with gap | 390 drawer, 1180 rail | `L03pub-AX-005-drawer-390-tabwalk.txt`, `AX-005-rail-1180.png`, `AX-005-rail-after.png` |
| C6-AX-006 | FAIL | 820/390 | `AX-006-filter-sheet-820.png`, `AX-006-filter-sheet-390.png` |
| C6-AX-007 | FAIL | 1440/820/390 | `L03pub-AX-007-tabwalk.txt` |
| C6-AX-008 | BLOCKED | 1440 accent group only | none beyond the accent test |
| C6-AX-009 | PASS with gap | 1440/820/390 | `L03-AX-009-settings-tabwalk.txt`, `L03-AX-009-settings-tabwalk-long.txt` |
| C6-AX-010 | FAIL | 1440/820/390 | `L03pub-AX-010-targets.txt`, `L03-AX-010-admin-targets.txt` |
| C6-AX-011 | BLOCKED | not driven | none |
| C6-AX-012 | FAIL | 1440/820/390 | `L03pub-AX-012-reduced-motion.txt` |
| C6-AX-013 | PASS | 390/820 | `AX-013-category-820-reconnected.png` |
| C6-AX-014 | PASS | 1440 | session output only |
| C6-AX-015 | PASS with gap | 390 | `AX-015-search-empty-390.png` |
| C6-AX-016 | BLOCKED | 1440 local bookmark only | `AX-016-bookmark-toast-1440.png` |
| C6-AX-017 | BLOCKED | none | I did not use a real screen reader |
| C6-AX-018 | BLOCKED | none | no real coarse-pointer device |
| C6-AX-019 | FAIL | 1440 | `L03-AX-019-admin-names.txt` |

Notes on specific AX rows:
- **C6-AX-003:** direct and same-page fragment navigation worked on tag pages at all three widths. The 390 same-page case failed in agent-browser, but a second method (chrome-devtools, 500px viewport) scrolled and focused the heading. So that failure was my tool, not the product. The remaining failure is T6-03-12.
- **C6-AX-005:** drawer focus is trapped and restored at 390. Escape and backdrop close return focus to the trigger. The rail collapse and expand pair works by keyboard; a first attempt failed because I used a stale control.
- **C6-AX-006:** the 820 and 390 sheets show no `role=dialog`, no `aria-pressed` toggles, no live region and no trap, and focus is not restored.
- **C6-AX-007:** the Tab order is logical, but see T6-03-01.
- **C6-AX-008:** the accent radios follow the arrow keys, Home and End, and wrap. I changed Accent through its radios and restored it to `crimson`, re-reading `GET /api/user/preferences` to confirm. System, font, layout and learning radios were not driven.
- **C6-AX-009:** every settings stop had a ring and there was no trap, but `/settings/notifications` is a 404, and "Email digest" and "In-app updates" (MB-06) do not exist as controls. Only `digest-cadence` and `digest-timezone` appear.
- **C6-AX-013:** offline, Retry and reconnect work on category pages. The tag page recovers but focus lands on BODY, not on the H1; the category page puts focus on the results region, not the H1.
- **C6-AX-014:** an aborted listing shows ErrorPage within 1 s, and after restoring the network it recovered by itself in under 4 s without a click.
- **C6-AX-015:** the empty-state `role=status` and the actionable `role=alert` error are correct. `aria-busy` is set during loading. Unmeasured states were not checked.
- **C6-AX-016:** bookmark toggle swaps the label and `aria-pressed`, but no live region or toast appears. Favorite, undo and validation were not driven.

SH rows:

| id | verdict | widths driven | evidence |
|---|---|---|---|
| SH-01 | PASS | 1440 | session output |
| SH-02 | PASS (see T6-03-09) | 1440 | `SH-02-more-open-1440.png`, `SH-02-after-1440.png` |
| SH-03 | PASS | 1440 | `SH-03-menu-1440.png` |
| SH-04 | BLOCKED-BY-POLICY | none | not performed |
| SH-05 | BLOCKED-BY-POLICY | none | not performed |
| SH-06 | PASS | 1440/820/390 | `SH-06-wrong-1440.png`, `SH-06-wrong-820.png`, `SH-06-wrong-390.png` |
| SH-07 | BLOCKED-BY-POLICY | none | rate limit not provoked |
| SH-08 | PASS | 1440/820/390 | `SH-08-offline-1440.png`, `SH-08-offline-820.png`, `SH-08-offline-390.png` |
| SH-09 | BLOCKED | none | no way to hold `/api/auth/user` pending |
| SH-10 | PASS | 1440 | `SH-10-signedout-admin-1440.png` |
| SH-11 | BLOCKED | none | no non-admin account available |
| SH-12 | BLOCKED | none | no expired session available |
| SH-13 | BLOCKED | none | stats pending state not tested |
| SH-14 | PASS | 820 | `SH-14-stats-failure-820b.png` |
| SH-15 | PASS | 1440 | `SH-15-admin-unknown-1440.png`, `SH-15-signedout-unknown-1440.png` |
| SH-16 | PASS | 1440 | session output |
| SH-17 | PASS | 1440 | session output |
| SH-18 | PASS | 1440/820/390 | `SH-18-admin-820-start.png`, `SH-18-admin-390-start.png` |
| SH-19 | PASS | 1440/820/390 | `SH-19-admin-820-end.png`, `SH-19-admin-390-atend.png` |
| SH-20 | PASS | 1440 | session output |
| SH-21 | PASS | 1440/820/390 | session output |
| SH-22 | PASS | 1440/820/390 | session output |
| SH-23 | PASS | 1440/820/390 | `SH-23-edits-390.png` |
| SH-24 | PASS | 1440/820/390 | session output |
| SH-25 | PASS | 1440/820/390 | session output |
| SH-26 | PASS | 1440/820/390 | session output |
| SH-27 | PASS | 1440/820/390 | session output |
| SH-28 | PASS | 1440/820/390 | session output |
| SH-29 | PASS | 1440/820/390 | session output |
| SH-30 | PASS with gap | 1440/820/390 | session output |
| SH-31 | PASS | 1440/820/390 | session output |
| SH-32 | PASS | 1440/820/390 | `SH-32-github-1440.png` |
| SH-33 | PASS | 1440/820/390 | session output |
| SH-34 | PASS | 1440/820/390 | session output |
| SH-35 | PASS | 1440/820/390 | `SH-35-research-1440.png`, `SH-35-research-820.png`, `SH-35-research-390.png` |
| SH-36 | PASS with gap | 1440/820/390 | `SH-36-settings-menu-1440.png`, `SH-36-settings-menu-820.png`, `SH-36-settings-menu-390.png` |
| SH-37 | PASS | 1440 | session output |
| SH-38 | PASS with gap | 1440 | `SH-menu-Pending_approvals-1440.png` |
| SH-39 | PASS with gap | 1440 | `SH-menu-Rejected_resources-1440.png`, `SH-39-rejected-1440.png` |
| SH-40 | PASS | 1440 | `SH-menu-Sub-Subcats-1440.png` |
| SH-41 | PASS | 1440 | `SH-Journeys-1440.png` |
| SH-42 | PASS | 1440 | `SH-Digests-1440.png` |
| SH-43 | PASS | 1440 | `SH-43-newentry-1440.png` |
| SH-44 | BLOCKED | none | no real coarse pointer and no real touch device |

Notes on specific SH rows:
- **SH-06:** one wrong attempt only. `POST /api/auth/admin-login` returned 401 and the alert read "Incorrect password."
- **SH-08:** the alert is "Couldn't reach the server…" and the button stays enabled, so retry is possible.
- **SH-14:** the alert plus Retry showed. Retry re-issued one `GET /api/admin/stats`. After the route was restored, Retry succeeded and focus landed on the H1.
- **SH-16:** all 15 canonical sections plus `link-health`, `sub-subcategories`, `sub-subcats`, `github-sync`, `journeys` and `digests` resolved with `noindex, nofollow`. `subsubcategories` highlights Subcategories.
- **SH-17:** Back, Forward, a manual hash edit, `?tab=users` (the `history.replaceState` was a synthetic popstate, not a native URL load) and cold `?tab=audit` all worked. Back to bare `/admin` returned to Overview.
- **SH-20:** Arrow keys, Home and End move and activate tabs. Space and Enter did not change anything. Tabbing into the strip on Journeys or Digests did not replace the panel.
- **SH-21 to SH-35:** a tab switch pushes `#<hash>` and shows the matching panel. The GitHub tab needed a fresh ref after the strip scrolled. Some of this was driven with DOM-based clicks and the 390 sweep with real pointer clicks. At 820 and 390 I also tried `agent-browser find` clicks that missed, which cost many retries.
- **SH-30, SH-36, SH-38, SH-39:** the "return from Sub-Subcats" restore, Settings keyboard navigation at 820/390 and the both-count-states checks were not driven.
- **SH-37:** `/settings/theme` opened and no write request fired.
- **SH-40:** the Settings button read "Settings · Sub-Subcats" and Subcategories stayed highlighted.
- **SH-43:** twice from Resources, and once from another tab.

## QA rows
None created, so nothing to delete.

## Settings changed and restored
- Accent preference on the owner account: before `crimson`, changed through the radios (`magenta`, `rose`), restored to `crimson`. Re-read confirms `{'systemId':'editorial','accentId':'crimson'}`. Five `PUT /api/user/preferences` calls (all 200).

The owner session stayed valid throughout (`/api/admin/stats` returned 200 after the account-menu Admin click). I never clicked Sign out and never submitted the owner password.

## Not driven
C6-AX-011, C6-AX-017, C6-AX-018, the rest of C6-AX-008, SH-09, SH-11, SH-12, SH-13, SH-44, and the unchecked widths listed in the matrix.