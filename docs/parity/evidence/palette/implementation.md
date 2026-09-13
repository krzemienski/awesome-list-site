# Search palette implementation (Task 541)

- The palette owns its Radix dialog portal, overlay, focus trap, scroll lock, Escape close, and return focus to the element that opened it.
- Geometry follows the canonical `CmdPalette`: 640px maximum width, 12vh top placement, 76vh maximum height, 40px viewport gutter, 14px/18px input, 10px/12px rows, 54px/1fr/auto row grid, and 10px/18px footer.
- Resource search retains the `/api/resources` page-one React Query key, normalization, analytics, selection navigation, and recent-search commit rules. Categories use the live typed `/api/categories` query.
- Empty discovery retains recent searches and adds useful Pages and Categories. Query results include Resources, Pages, and Categories; resource rows are first and precede View all so Enter opens the first resource before that fallback.
- Palette contact is available for contact variants `b` and `e` only when a configured destination exists; it retains the existing handoff behavior and is shown as **Get in touch** at the end of Pages.