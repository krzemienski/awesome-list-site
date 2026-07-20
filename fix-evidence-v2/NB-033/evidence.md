# NB-033 (LOW) — scrollRestoration='manual' but never restores; Back lands at top
**Verdict: FIXED (real bug, root-caused).** Two defects:
1. No save/restore existed. Added scroll save (sessionStorage keyed by history entry) + restore on popstate.
2. **Back appeared completely dead on category pages**: the URL-sync effects in Category/Subcategory/SubSubcategory (and the Search page-write effect) have `location` in deps — on Back-away the effect's final run `replaceState`'d the OLD page's own path over the DESTINATION history entry, so the Back navigation was silently undone and scroll restore never ran. Fixed with a pathname bail guard in all 4 files (effect no-ops when window.location.pathname no longer matches the page's own route).

Live probe (Playwright, 3/3 deterministic runs):
```
NB-033 scrolled to 600, went to category, Back → home restores scrollY=600 PASS
```
Regression check: Run16 BUG-005 in-page pagination pushState/Back behavior still PASS. Probes: /tmp/nbev/probe33g.mjs.
