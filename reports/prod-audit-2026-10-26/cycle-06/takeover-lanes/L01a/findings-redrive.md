**Verdict: ISSUES.** My verdicts are unchanged by the re-drive: PC-011 is still FAIL, and PC-005, PC-007 and PC-014 are still PARTIAL.

**What I re-drove after the lead's note.** Production was still `bc1797b065c1989ab92f512633f69bf3fe25e718` at 19:38Z. The suspect window was 19:24–19:36Z. Four groups of captures were taken in session `L01a` during it, and I checked each.

| Capture | Window status | Outcome |
|---|---|---|
| PC-014 error and Retry at 1440, 820 and 390 (including the 820 retry) | In the window (19:27–19:33). Re-driven. | All three widths hold, see below. |
| PC-005 Docs hrefs (header and drawer) | In the window (19:27). Re-driven. | Same result, so T6-01a-02 stands. |
| PC-014 empty state | In the window. Not re-driven; it stays BLOCKED, because production never serves an empty tree and the stub route was ignored. | Unchanged. |
| PC-014 loading skeleton | Separate chrome-devtools context. Kept. | Unchanged. |

Captures from `L01a-owner` (PC-007, the owner views of PC-005, PC-008 and PC-013) came from a different session, so I kept them. The `L01a` captures from before 19:24Z (PC-009 to PC-012, PC-015, PC-016) were taken before the second agent started, so I kept those too.

**PC-014 re-drive** (`r2-pc014-error-retry.txt`, `r2-pc014-820-retry.txt`, screenshots `r2-pc014-*`):
- At 1440 and 390 the error state shows a 44px Retry. One click fires one `GET /api/awesome-list/nav` and the sidebar returns with 9 categories.
- At 820 there are two Retry buttons with the same testid, one in the persistent sidebar and one in the drawer. In the first re-drive my click hit the wrong copy and navigated to `/submit`. That was my selector, not the product.
- Targeting the visible persistent copy, one click fires one nav request and recovers with 9 categories.
- The 820 anomaly in my earlier run, which showed 0 requests, was not a product defect.

**PC-005 Docs re-drive:** the guest drawer's "Docs ↗" goes to `https://github.com/krzemienski/awesome-video/tree/master/docs`. The header's "Docs ↗" goes to `/design-system` with `target=_blank`. Because the guest drawer has the Docs link, T6-01a-02 is wider than I first reported, and the earlier line saying "the guest drawer has no Docs link" was wrong. `pc005-docs-drawer-guest.txt` was wrong because of the tool clash and is superseded by this capture. The newer captures are in `r2-pc014-*` and the console output above.

**Findings (unchanged apart from the T6-01a-02 correction)**

| id | sev | URL | width | saw vs expected | likely source |
|---|---|---|---|---|---|
| T6-01a-01 | MEDIUM | `/`, `/category/*` | 1440, 820, 390 drawer | The "All in …" links can be clicked over a 9px strip only, because `margin-block:-11px -9px` lets the next row cover them. At 390 four drawer rows measure 38px effective, below the 44px touch minimum. | `client/src/styles/shell/sidebar-tree.css:280` |
| T6-01a-02 | LOW | `/about` and other pages | 1440, 390, 820 | Header "Docs ↗" goes to `/design-system` in a new tab. The drawer "Docs ↗" goes to GitHub, for guests and admins alike. | `AppSidebar.tsx:1131`, `AppHeader.tsx:112` |

All other evidence is in `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L01a/`. I created no QA rows and changed no settings on any account.

**Still undriven:**
- The member-role views of PC-005 and PC-007, and the PC-007 unread badge with a nonzero count (there is no member session).
- Sign out (BLOCKED-BY-POLICY).
- The genuine empty nav state.
- The 390 loading skeleton.
- PC-015 at 1279 and for a resource with no resolved ancestors.