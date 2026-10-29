# C7 AX02 — INTERIM (worker stopped at its context ceiling)
Worker: sonnet a470034beedb94663. Revision 31d0acce. Evidence: e2e-evidence/cycle-07/AX02/.
- C7-AX02-01 CONFIRMED, MEDIUM: navigating in-app to /advanced while offline shows "You're offline"; after reconnect the page never recovers and ends on "This page failed to load" with copy blaming a site update. Reproduced twice; /categories, /about and /category/* recover. Lead source trace: the lazy Advanced chunk import fails offline; RouteErrorBoundary (App.tsx ~:340-380) holds the chunk error with no reconnect retry, and React.lazy caches the rejected import. Routed to FIX-C7-14.
Observation (to judge in AX02b): 18 "Show 2 more tags" buttons on a category page share one name and do not say which resource they belong to.
Partial: AX-013, 014, 019 at 1440 (+ bits at 390/820). Undriven: AX-015, 016, SH-01..03. BLOCKED: AX-017 (no screen reader), AX-018 (no coarse pointer), SH-04/05 (policy).
