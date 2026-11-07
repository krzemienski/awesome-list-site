# ux-a11y, cycle 03 (rev b89d3e4b, signed out): ISSUES, 1 MEDIUM (PG-10)

| id | sev | where | saw vs expected | source |
|---|---|---|---|---|
| PG-10 | MEDIUM | any category route at 1440, keyboard Enter on a link (Geist/cyan, editorial/crimson) | After a keyboard-triggered client-side navigation the route h1 gets `data-route-focus`. `:focus-visible` matches but the outline is `none`, so there is no ring. Expected: keyboard-triggered heading hand-offs show a ring. Hand-offs without the attribute (Back to top, reconnect) do show one. | `client/src/styles/app-bridge.css:247` `[data-route-focus]:focus { outline: none !important; }`; `client/src/lib/nav-history.ts:141,167` set the attribute whatever the input modality |

## Re-checks

- **PG-04 to PG-09, OF-01 and PG-01 to PG-03:** fixed.
- **PG-08:** the focused heading ends up off-screen, because the restored scroll position wins over the fragment.

## Passed

- **Structure:** landmarks, labels and alt text, heading levels, no horizontal scroll at 390 and 820.
- **Sizes and motion:** targets ≥44px at touch widths, and reduced motion.
- **Contrast:** 8 theme combinations on the category page.

## UNVERIFIED

- Screen-reader output.
- Contrast on other page types.
- Route focus at 820 and 390.
- Pointer-only ring suppression (not re-measured).
- Signed-in fragments.
