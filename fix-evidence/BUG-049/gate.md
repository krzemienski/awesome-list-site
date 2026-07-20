# VG-049 — Dead tab stop on `<body>`

**Verdict: PASS**

## Root cause
`<body>` never had a tabindex — the dead stop was a DOM-order artifact. The
analytics consent banner autofocuses itself on mount (R4-071) but was rendered
**last** in the DOM (after the router in App.tsx). From page load, Tab 1–3 hit
the banner's controls; Tab 4 exited the document past the last focusable
(activeElement fell back to `<body>` — the dead stop the auditor recorded);
only Tab 5 wrapped back to the skip-link.

## Fix
`<ConsentBanner />` now renders **before** `<Router />` (client/src/App.tsx),
making it first in DOM order. Fixed positioning keeps it visually at the
bottom; tab order is now banner controls → skip-link → page, with no document
exit in between. (consent-banner.tsx comment updated to match.)

## Live keyboard-only evidence (dev, 1440×900, real Chromium)
Focus log, fresh load with banner visible:
```
initial: banner container (autofocus)
Tab 1: a "Privacy Policy"        (banner)
Tab 2: button "Decline"          (banner)
Tab 3: button "Allow analytics"  (banner)
Tab 4: a.skip-link "Skip to main content"   ← was the dead <body> stop
Tab 5: sidebar "Awesome Video…"
Tab 6-8: nav links (Home, Submit Resource, Learning Journeys)
```
No `<body>` appears anywhere in the log; every focus target is visible.

Skip-link path (banner dismissed, reload):
```
Tab 1: a.skip-link "Skip to main content"   ← first useful focus target
Enter: main#main (focus moved into main content)
Tab:   button "Filter by Tag"               ← next stop is INSIDE main
```

## Pass criteria mapping
- `<body>` is not a dead tab stop — confirmed (absent from full focus log).
- First useful focus target is a valid banner control (consent banner, per
  R4-071 autofocus) or, without the banner, the skip link — both observed.
- Skip navigation reaches main content — Enter lands focus on `main#main`,
  next Tab continues inside main ("Filter by Tag").
- No focus trap or unreachable control introduced — full log advances
  monotonically through banner → skip-link → sidebar → content.

Screenshots: `tab4-after-banner.png`, `skiplink-first-tab.png`,
`after-skip-to-main.png`.
