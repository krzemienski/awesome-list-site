# Built-in app tester follow-up — 2026-09-15

User requested native app testing rather than shell test execution. Resumed
the existing `parity-card-instances` tester against the main app on port 5000.
No source changes, database writes, or workflow restarts during this pass.

## Verified at 1440×900 and 375×812

- Home → Community & Events via real category click; mobile used the drawer.
  Category showed 24 cards and “Showing 1–24 of 80 resources.”
- Header search focused its combobox; `HydraSRT` returned one matching resource.
- Escape closed search and restored trigger focus, including immediate
  reopen → ready → Escape.
- Mobile drawer close restored focus to its trigger.
- Zero console errors, page errors, or failed requests observed.
  Clerk development-key warning was the only warning.

Evidence: desktop category `wls3c7`, search `759rke`, restored focus `na7ya9`;
mobile drawer `26a7mw`, category `6grqa7`, search `69yya7`, restored search
focus `1ze0c2`, restored drawer focus `o19g1h`.

## Defect: browser Back from a category never reached Home — FIXED

The tester first described a history mismatch as "timing" and used the brand
link to restore Home; asked to clarify, it reproduced the failure:

Repro at 1440 (before the fix):
1. Load `/`; wait for `[data-testid=home-layout-index]`.
2. Click `link-category-community-events`; wait for the category H1.
3. Browser Back → URL is `/` for an instant with Home count 0, then the URL
   is `/category/community-events` again with the category still rendered.
   Screenshot `415udp`. No console or request errors.

One-shot Chromium probe (`scripts/.back-probe-tmp.mjs`, deleted): only one
`pushState` (wouter's Link) ever happened, `history.length` stayed 3 after
Back, and a second Back landed on `about:blank` — i.e. the entry at `/` had
been **replaced** with the category URL.

Cause: `TaxonomyListing`'s URL-sync effect lists the router `location` as a
dependency. On the popstate it re-ran while the listing was still mounted,
computed its own href, saw the document at `/`, and `replaceState`d the
category URL over the entry the user had just navigated to. wouter observes
`replaceState` and re-rendered the listing.

Fix (owning component, `client/src/pages/TaxonomyListing.tsx`): the effect
returns early unless `window.location.pathname` is the listing's own path
(`samePath`: percent-decoded, trailing-slash tolerant), so it never writes
while the document is being navigated away from.

Verification after the fix:
- Chromium + Firefox probe: Back → `/` with Home rendered; Forward → category;
  Next → `?page=2`; Back → `/category/community-events` page 1.
- Tester re-run (fresh 1440 context, `parity-card-instances:326`): Back
  restored Home URL and DOM in 125 ms; Forward restored the category; Next
  gave `?page=2` / "Showing 25–48 of 80"; Back returned to page 1 of the
  category, not Home. `badResponses: [] consoleErrors: [] pageErrors: []`.
  Screenshots `rsoiu5` `nfwvkf` `w3m1gr` `l8vgbm` `sxi76o` `btqzyy`.
- `tests/e2e/browse-categories.spec.ts` 35/35 on Chromium; `url-params-audit`
  validation TOTAL 35, FAIL 0 (in-page URL sync for filters/pages intact).

Integration note: this is the task's only component edit; it touches one
effect in one page and no public contract, selector or copy.
