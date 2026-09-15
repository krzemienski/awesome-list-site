---
name: Native tester false defects to re-check before logging
description: Recurring tester findings in this app that turned out to be timing/locator errors, with the controlled re-check that settles each.
---
Re-check these before recording a defect:
- Radix menu ArrowDown "does not move": tester pressed before Radix's focus frame; re-run with Enter → wait ~600ms → ArrowDown.
- Search palette ArrowDown "stuck on result 0": debounced results re-render resets cmdk highlight; wait ~1.5s after typing.
- Focused control reports `outline 0px` while a ring is visible: outline transition mid-value; screenshot pixels are authoritative.
- "Clerk sign-in card unreachable by Tab": it is light DOM at stops right after the sidebar; the tester's stop counting wrapped. Show/Hide password "no-op" = click on the hidden pre-identifier password node.
- `getByRole('dialog')` = 0 while drawer/search visibly open: locator timing; both are Radix DialogPrimitive.Content.
- Fixture "missing" from category pages: category listing is grouped by subcategory (alphabetical within), not newest-first.
- Guest Favorite opens a non-modal toast, not a dialog; Share on mobile emulation hands off to Web Share (no toast).
- Home is a dashboard with no resource cards; card controls live on listing/detail routes.
- Listing-page card tag pills are FILTER chips (`?tags=`, aria-label "Filter by tag"); only detail-page chips navigate to `/tag/<slug>`.
- A detail `h1` read right after click can return the page-level heading: wait for the route + `main h1` change, not just the click.
- "Sticky header clips content" at 375: content scrolling under the 56 px sticky header is by design; measure the target after scrollIntoView and click it before logging.
- Near-black intermediate captures on the dark theme with a live DOM are the tester's capture pipeline, not a render defect; judge by final captures.
- Admin table census taken at 2 buttons instead of ~20: the table was still loading; gate on "row count stable across two reads 2 s apart + no in-flight /api for 1 s" before counting.
