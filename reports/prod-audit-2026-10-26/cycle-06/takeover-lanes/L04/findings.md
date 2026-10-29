Baseline restored and re-read: favorites [185551,186357], 12 bookmarks all saved/untagged/unfiled/no notes/not archived, collections [], notification preferences unchanged. I am stopping here because of context limits and returning the matrix so far.

## L04 report (partial)

**Verdict: ISSUES, and not complete.** Only 14 of 81 rows are driven. Production stayed on `bc1797b065c1989ab92f512633f69bf3fe25e718` at start and end. I never signed out, never hit sign-in, and never printed the cookie. Rows marked PASS below were driven at 1440 only, so no row has all three widths yet.

### Findings
| id | sev | URL | width | saw vs expected | evidence | source |
|---|---|---|---|---|---|---|
| T6-04-01 | medium | `/bookmarks?collection=158` Rename dialog | 1440 | Clearing the name with `fill ""` or Ctrl+A+Backspace left "Save name" enabled, and clicking it sent PATCH 200 with the old name. The same occurred with the note textarea. Whitespace-only input correctly disables Save, so this is only the empty-string case. I have not ruled out my tool, because `fill ""` did not fire onChange. A second method (Ctrl+A+Backspace) did not clear the field either. Treat as unconfirmed. | `mb018-blank-submit-1440.png` was not saved; this is based on terminal output only | not located |
| T6-04-02 | low | `/settings` Notifications | 1440 | An invalid timezone does focus the field `#digest-timezone` and shows "Choose a valid IANA time zone.". My first check missed it. **This is a PASS, not a defect.** | terminal output | not applicable |
| T6-04-03 | info | `/settings/notifications` | 1440 | Returns "Page Not Found". The notification settings live inside `/settings`. If some surface links to the old route, that is a defect. | terminal output | not located |

I found no confirmed defect beyond T6-04-01, which is unconfirmed.

### Row matrix
| row | verdict | widths | evidence |
|---|---|---|---|
| MB-002 | PASS | 1440 | `?tab=` restored each panel; Back and Forward followed the URL. Focus stayed on the Security tab after Back, which I did not judge. I did not check for protected-content flash. Partial. |
| MB-016 | PASS | 1440 | Watch next, Archived, Active and In progress cards set `?status=` and `?archived=`. I did not check whether zero is shown before load. |
| MB-017 | PASS | 1440 | `mb017-col-a-1440.png` was not saved. Collection filter showed membership and count, and `?collection=` was in the URL. I did not drive the mobile Collection select. |
| MB-018 | FAIL (unconfirmed) | 1440 | Create (POST 201, name trimmed) and rename (PATCH 200) work, and whitespace-only is blocked. See T6-04-01. |
| MB-019 | PASS | 1440 | PUT reorder 200; boundary buttons disabled; focus moved to the moved item's other control. |
| MB-020 | PASS | 1440 | Archive revoked the public link (404); Restore worked. |
| MB-021 | PASS | 1440 | Publish gave a public URL (200); Copy gave a "link copied" toast; Unpublish gave 404 and the toast "Public access revoked". |
| MB-022 | PASS | 1440 | Cancel made no write; confirm deleted the collection; focus went to "All saved". |
| MB-023 | PASS | 1440 | Status and Visibility filters change the URL. I did not drive Sort or the Visibility values other than Archived. Partial. |
| MB-024 | PASS | 1440 | Selected count is announced in a live region. I did not check the filter-reset behaviour. |
| MB-025 | PASS | 1440 | Bulk apply sent POST 200 and the toast "Queue status updated". I did not drive partial failure. |
| MB-026 | PASS | 1440 | Move sent POST 200 with real memberships. I did not drive already-present IDs. A 20px checkbox needed a tall viewport; this is a tool limit, not a defect. |
| MB-027 | PASS | 1440 | Tag Add and Remove both worked. The tag input is capped at 40 characters. |
| MB-028 | PASS | 1440 | Archive and Restore worked; focus returned to Select all. |
| MB-029 | PASS | 1440 | Notes save sent POST 200; the count was accurate; Cancel made no write; the 500-character limit held. |
| MB-052 | PASS (partial) | 1440 | The invalid timezone is rejected inline. I did not drive a valid save, or the dirty state after a successful save. |
| MB-058 | PASS (partial) | 1440 | `/settings` shows all five cards with the expected links. I did not click each one. |

**Undriven (PENDING):** MB-001, 003 to 015, 030 to 051, 053 to 057, 059 to 081. That is 63 rows plus the partial ones above. The 390 and 820 touch widths were not driven for any row.

**Blocked:** MB-014, MB-015 (account deletion, blocked by policy), MB-004 (sign-out controls, blocked by policy), MB-001, MB-032, MB-079 (second identity needed).

### QA rows
- Collection 157 `[QA-audit-1026] col A` and 158 `[QA-audit-1026] col B` (renamed to B2, then B3) were both created and deleted by id. A re-read of `/api/collections` returns `[]`. A public link created for 158 returned 404 after unpublish and delete.
- I made no API keys, submissions or contributions.

### Settings changed and restored
| item | before | after restore |
|---|---|---|
| Bookmarks 184751 and 186477 queue status | saved | saved (re-read) |
| Bookmark 186231 archive flag | not archived | not archived (re-read) |
| Bookmark 184763 note | none | none (re-read) |
| Personal tags | none | none (re-read) |
| Collection memberships | none | none (re-read) |
| Favorites | [185551, 186357] | [185551, 186357] |
| Notification preferences | unchanged; unsaved form edits discarded without a write | unchanged |

Evidence is in `reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L04/`. Only `before-state.txt` and `mb052-invalid-tz-1440.png` were saved there; the other `mb0*.png` files did not reach that folder and may be elsewhere on disk. Command output in this session supports the verdicts above.