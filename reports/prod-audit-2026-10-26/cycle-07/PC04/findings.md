# C7 PC04 (category page: states, facets, views, pagination, related)
Worker: sonnet a7502b5ed5553aa2d. Revision 31d0acce. Evidence: e2e-evidence/cycle-07/PC04/.
- C7-PC04-01 CONFIRMED, LOW: the "Page N is not available" notice survives in-page filter/search changes. Lead confirmed in source: TaxonomyListing.tsx clears `notice` only on URL hydration (:216) or Dismiss (:733). Routed to FIX-C7-13.
Partial coverage, mostly 1440 (and some 390); 820 not driven; 041 and 047 undriven. Remainder -> PC04b.
