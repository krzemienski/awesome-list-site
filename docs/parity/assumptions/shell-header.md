# Canonical header mapping

## Rendered reference, not just stylesheet declarations

The frozen `layout.jsx` Header supplies inline `gap: 14`. This overrides the
stylesheet's 18px desktop / 10px mobile declarations. The app follows the
effective 14px gap. Heights are 60px above 768 and 56px through 768; horizontal
padding is 24px / 14px. The header consumes the merged parity paint, font,
radius, border, and shell-height tokens; no shared stylesheet was edited.

The reference artifact's `docs/` directory is currently empty. The retained
canonical spacing/pattern documents and frozen layout/styles were consulted.

## Navigation and identity

| Slot | App mapping |
| --- | --- |
| Logo + wordmark | Home `/`; canonical accent tile and lowercase `av`, not the previous outlined brand mark |
| Browse | `/categories`, as explicitly required by the assignment; active on home and categories |
| Submit | `/submit` |
| About | `/about` |
| Docs ↗ | `/design-system`, new tab; final docs URL is an integration handoff |
| Admin + live dot | `/admin`, only when the real app user has role `admin` |
| User pill | Real avatar or initial and first name; accessible name `Account · Admin`, `Account · Member`, or `Account · Visitor` |

The frozen design only renders the demonstrator admin Nick: it does **not**
provide a signed-out branch. Visitors retain the same rightmost pill with a
sign-in icon and “Sign in” text (icon-only through 768). It opens an account
menu containing Sign in, Theme Settings, and on-device saves when present.
Sign in preserves the existing pathname + query return destination.
The admin reference is compared only with a real disposable admin, never a
guest painted to look signed in.

Profile, bookmarks, notifications/unread count, settings, theme, admin and
sign-out remain in the account menu. Standalone utility buttons and inline
breadcrumbs do not belong in the canonical closed header. With explicit user
authorization, the prior location semantics and testids moved to a page-owned
breadcrumb immediately inside `main`. It resolves taxonomy from the existing
nav tree, entity names from existing page title updates, shared collections,
tags, invalid resources, and unknown routes without adding API fetches.

## Search and sidebar contracts

Search totals recursively sum the existing lightweight category tree, with
the same exclusions as Home. No corpus fetch or second total endpoint was
introduced. An unavailable tree displays an ellipsis, not an invented count.

There is deliberately **one** responsive search button. At desktop/tablet it
renders the compact search trigger; through 768 it renders the canonical 36px
icon button. This avoids a hidden duplicate winning the palette's existing
`button[aria-label="Open search"]` focus-restoration query and preserves the
existing `button:has(svg):has-text("Search")` e2e selector. The label is visually
hidden, not removed, on tablet/mobile. Thus the reference's separate
`hide-mobile`/`show-mobile` search buttons are consolidated without changing
visible order or dimensions.

The menu consumes the existing `SidebarTrigger` (and its `toggleSidebar`) and preserves
`data-sidebar="trigger"`, `mobile-drawer-trigger`, and “Toggle sidebar”.
It is visible through **1024 inclusive**, overriding the old global
769+ hide rule only within this header. The coordinated page-breadcrumb change
also aligns MainLayout's shared offset to the canonical 56px at exactly 768.

## Accessibility and deliberate differences

- Account menu items retain 44px minimum height.
- Keyboard focus uses a visible accent outline. The reference has no explicit
  focus-visible skin; the accessible outline is intentional.
- The reference's empty inline live-dot span does not visibly paint its
  declared width/height. The app reserves the same inline margin and paints
  the requested dot absolutely, avoiding a 5px nav-width shift.
- Native button line-height/font-feature defaults are made explicit: Tailwind's
  inherited body features otherwise widen the search text and keycap.
- No `track()` calls existed in the previous AppHeader (zero before/after);
  palette analytics and auth callbacks remain untouched.

## Integration handoffs

1. Production baseline's *visible* inventory reports `mobile-drawer-trigger`
   removed at 1440, as required by canonical desktop visibility. Its DOM testid
   is retained. Do not make the desktop trigger visible just to clear that delta.
2. The artifact documentation destination remains `/design-system` until its
   owner establishes the final URL.