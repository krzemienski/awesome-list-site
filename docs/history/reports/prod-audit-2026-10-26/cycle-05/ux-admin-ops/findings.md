# ux-admin-ops, cycle 05 (rev 63a1c79d, 02:58Z start and 03:22Z end): ISSUES, 3 LOW

| id | sev | where | saw vs expected | source |
|---|---|---|---|---|
| AO-19 | LOW | /admin/users, search filled, 390 and 820 coarse | The "Clear user search" button is 36×36. Expected at least 44 on touch. | UsersTab.tsx:231 (h-8 w-8) |
| AO-20 | LOW | /admin/audit | Legacy auth.* rows (login, register, logout, login failed) and the `recommendation bogus-value` row show a muted RECORDED chip. A failed login reads as neutral. ACTION_STATUS has no auth.* entries. | AuditTab.tsx ACTION_STATUS |
| AO-21 | LOW (weak) | /admin/users, 390 and 820 | The swipe hint is the only cue that the table scrolls sideways. It sits above the table and still shows at 820. The Edit buttons start off-screen at x=743 inside a 302px scroller. | UsersTab.tsx hint |

## Re-checks
- Fixed: AO-04, AO-05, AO-07, AO-09 to AO-16, and AO-17 for exports.
- AO-01: the network-failure toast was seen live. The 5xx wording was checked in code only.
- AO-08: partly fixed (AO-21 covers the rest).
- Cycle-04 part-B gaps: all confirmed.

## Passed
- Users: search, sort, paging, and touch targets apart from AO-19. The role and delete dialogs were cancelled.
- Audit: filters, ID validation and paging.
- Contact.
- Exports: all four kinds.
- The validation, link-check, backup and seed confirms, all cancelled with no POST.
- Link Health counts and filters.
- The tab strip.
- No console errors.

## Side effects
Seven append-only export audit rows: 27482–27485, 27489, 27498 and 27499.

## UNVERIFIED
- Real touch input (only pointer:coarse was emulated).
- The live 5xx toast.
- Validation lists and backup tables, since there is no data for either.
- The chart at 390 below the fold.
- The degraded chip, since no rows have that status.
- Reduced motion and a keyboard walk.
