# ux-public-core, cycle 03 (rev b89d3e4b): ISSUES, 1 LOW (PC-23); PC-12 still open (owner decision)

Signed out. Consent was dec‍lined and umami was disabled. The auditor made no writes. Browser: chrome-devtools, isolated context `pc3`. Evidence is in this directory.

## Findings

| id | sev | where | saw vs expected | source |
|---|---|---|---|---|
| PC-23 | LOW | `/` index rail, 1440×900 and 1366×768 | The rail is sticky only when the viewport is at least 1200px tall: `@media (min-width:1025px) and (min-height:75rem){.home-index-rail{position:sticky;top:5.25rem}}`. At 900px and 768px tall the computed position is `static`, so the rail scrolls away. At 1440×1300 it sticks (top 84 at scrollY 1166). Expected: sticky at ordinary laptop heights. | `client/src/styles/pages/home.css` |

## Re-checks

- **Fixed:** PC-10, PC-13, PC-14, PC-15, PC-17, PC-18, PC-19, PC-20, PC-21 and PC-22.
- **PC-16:** fixed, but checked by emulation only.
- **PC-12:** still open. MirrorFly 190151 is still live, waiting on the owner's content decision.
- **PC-01 to PC-09, PC-11 and PG-02/03:** not re-run.

## UNVERIFIED

- **Not re-run this cycle:** paging, sort, the Filters sheet, card focus order, route focus and hyphen spacing.
- **Rail:** checked at only three viewport sizes.
- **Back-to-top on the curated layout:** checked at 1440 only.
- **Not tested:** real devices and screen readers.
