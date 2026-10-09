# ANON-BROWSER: anonymous flows in a real browser

Status: PASS.

Command: `BASE=https://awesome.video SYS=<editorial|brutalist> VW=<1440|390> node docs/audit-578/live-smoke/browser-sweep.mjs` (Playwright Chromium).
Pages: home, category, subcategory, search+filters, resource 190152, journeys, journey 7, tag open-source, sign-in, 404.

Result for all four combos (docs/audit-578/live-smoke/{editorial,brutalist}-{1440,390}-sweep.json):
9 pages 200 + the 404 page 404; h1 on every page; data-system matches; horizontal overflow 0; no error boundary; 0 page errors; the only console error is the expected 404 document load.

Screenshots opened and inspected (docs/audit-578/live-smoke/shots/): editorial-1440-home, editorial-1440-notfound, editorial-390-search, editorial-390-category, brutalist-390-journey, brutalist-390-signin, brutalist-390-tag, brutalist-1440-resource. Correct system fonts and accents; no clipping or overlap.
