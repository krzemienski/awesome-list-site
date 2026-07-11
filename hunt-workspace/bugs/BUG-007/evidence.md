# BUG-007 — Sidebar toggle chevrons are undersized touch targets (22×38)

**Severity:** HIGH (WCAG 2.5.8 / Apple HIG 44pt touch target violation)
**Affected page:** every category page (12 distinct category pages observed),
specifically the sidebar nav with category tree
**Affected viewport:** 1440×900, 768×1024 (and 375 with risk of thumb-tap)
**Affected scope:** 24 / 205 URLs crawled show ≥30 instances per page;
17 category pages each surface ≥30 such buttons; report de-duplicates
to one bug + per-category variants

## Reproduction
1. Open https://awesome.video/category/community-events at 1440×900.
2. In the left sidebar, click the small chevron toggle next to "Community Groups", "Events & Conferences", "Cloud-Based Encoding Solutions", "Codecs", etc.
3. Using DevTools inspect, measure each toggle button: width 22px, height 38px. **22×38** is well under the WCAG 2.5.8 minimum target size of **24×24** (CSS pixels) recommended, and substantially below **44×44** pt (Apple HIG) / 48dp (Material).
4. On mobile (375×812), tapping those chevrons with a finger is error-prone (taps fall onto adjacent rows).

## Expected
The category-tree chevron toggles should be at least 24×24 CSS px, ideally 44×44 pt. The site has 1,946+ resources — navigating the category tree is the **only** public-browse path (no search input exists — see BUG-004), so making this unusable on mobile is a critical-path defect.

## Actual
Approximately 30+ chevron buttons on each category page are 22×38. This affects 17 category pages and 1 sub-subcategory page observed during the crawl, plus `/journeys`, `/advanced`.

## Evidence
- sweep-summary.json: each category page reports 30+ undersized elements
- `screenshots/sweep_1440_category_community-events.png`, etc.
- `inspect-undersized.js` output: `w: 22, h: 38` on every Toggle button (Community Groups, Events & Conferences, …)

## Fix prompt

```
Task: Increase the click/touch target of the category-tree chevron
toggles in the sidebar of https://awesome.video/. Today every chevron
button is 22×38 CSS pixels, well under WCAG 2.5.8's 24×24 minimum
and far below 44×44 pt (Apple HIG) / 48dp (Material) recommended
sizes. 30+ such buttons appear on each category page.

Reproduction: load /category/community-events at 1440×900, run
  await p.evaluate(() => [...document.querySelectorAll('button[aria-label*="Toggle"]')]
    .map(b => b.getBoundingClientRect()))
The width is 22px everywhere.

Acceptance:
1. Every category-tree chevron button measures ≥24×24 (CSS px) and
   ideally ≥44×44 pt.
2. The hit area can extend beyond the visual icon via padding.
3. Verifiable: re-run the inspect-undersized.js script after fix and
   confirm no button reports (width < 24 || height < 24).
4. Mobile verification at 375×812: taps on a chevron register on the
   toggle 95% of the time.
```
