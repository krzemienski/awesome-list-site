# Sidebar implementation worklog

## Task #539

Implemented the canonical sidebar/drawer boundary in the owned surfaces:

- `AppSidebar.tsx` now uses the full sidebar variant (no default icon rail),
  imports scoped sidebar/drawer CSS, shares one complete category tree with
  the tablet drawer, and closes the drawer on every route change.
- `ui/sidebar.tsx` keeps the public provider/primitive exports while adding a
  dedicated `<=1024px` drawer viewport signal. The full sidebar remains in
  flow at tablet widths; an owned Radix Dialog drawer is available there and
  at phone widths. Focus entry, Escape/backdrop dismissal, focus restoration,
  body scroll locking, and route-close behavior stay inside the primitive
  boundary without changing shared Sheet behavior.
- `styles/shell/sidebar.css` owns 280px desktop, 240px tablet, hidden
  `<=768px`, sticky offset/height, canonical accordion rows, active bar,
  focus rings, and scrollbar treatment.
- `styles/shell/drawer.css` owns the 86%/340px drawer geometry, opaque
  `--bg-2` surface, scoped overlay, close affordance, and 280ms canonical
  enter/exit keyframes.

## Handoffs

`AppHeader.tsx` remains the owner of trigger placement, header height, and
public trigger labeling. The primitive now makes that existing trigger a
drawer trigger at `<=1024px` and hides it above the canonical cutoff via the
owned scoped shell stylesheet.

`MainLayout.tsx` remains the owner of the shell row/flex composition and
`--header-height`. The sidebar consumes that variable for sticky positioning
and does not modify MainLayout, footer composition, shared Sheet behavior, or
design-system tokens.

Responsive audit expectations are documented in
`docs/parity/assumptions/shell-sidebar.md`: the old tablet icon-rail
expectation is intentionally replaced by a visible 240px sidebar at
769–1024px, while 768px is intentionally hidden plus drawer. Existing counts,
category tree source, public exports, and sidebar `data-testid` selectors are
preserved.

## Verification boundary

The component was verified after implementation; see
`docs/parity/evidence/sidebar/RESULTS.md` for commands, precise outcomes, two
failed full-union visual passes, final tablet accessibility fixes, and explicit
integration handoffs. Neither full-page pixel parity nor the broader category
page suite is claimed green.