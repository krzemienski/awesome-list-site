# VG-030 — Titles are hard-truncated (BUG-030)

**Verdict: PASS** — July 20, 2026, live Playwright probes on dev

## Root cause
Stored titles are clean — 0 titles in either corpus (dev public 1813, prod 1814)
end in "..."/"…", so the audit's 55 examples were **display** truncation: several
title surfaces used the CSS `truncate` utility (`white-space: nowrap` +
`text-overflow: ellipsis`), which clips at the pixel edge **mid-word**. The main
ResourceCard grid/compact views already used `line-clamp-2` (word-boundary safe);
the list-view row and several list/heading surfaces did not. Dev corpus has 53
titles >70 chars (≈ the audit's 55 on prod).

## Fix
Replaced `truncate` with `line-clamp-1 break-words` (+ full-title `title`
tooltip where missing) on every title surface. Line clamping ellipsizes at the
last **whole word** that fits (CSS line-breaking), never mid-word, unless a
single token is itself wider than the container (`break-words` covers that
unbreakable-token case, matching the gate's carve-out).

- Public: `Category.tsx` list-view row, `Profile.tsx` submitted-resources,
  `RecommendationCard.tsx` heading, `analytics-dashboard.tsx` popular resources.
- Admin (same class of bug): `PendingResources`, `ResourceManager`,
  `ResearcherTab` (×2), `JourneyStepsManager` (×2).
- No data/source changes — DB titles untouched; `title` attribute carries the
  full string on every clamped element.

## Live evidence (Playwright, real Chromium)
Probe: `/category/general-tools?search=QSV` surfaces the longest title in the
corpus (196 chars, id 186111) in list view, desktop@1440 and mobile@375:

| viewport | clamp | white-space | nowrap cuts | title attr full |
|---|---|---|---|---|
| desktop 1440 | `-webkit-line-clamp: 1` | normal | 0 | 196/196 chars |
| mobile 375 | `-webkit-line-clamp: 1` | normal | 0 | 196/196 chars |

(Computed `display` reads `flow-root` — modern Chromium's computed form of the
legacy `-webkit-box` clamp — with the clamp active and the box clipped.)

Broad sweep (24 list rows, both viewports): 0 titles render with
`white-space: nowrap` clipping; representative short titles render unclipped.
Screenshots: `vg030-desktop-long.png`, `vg030-mobile-long.png`,
`vg030-desktop.png` (24-row sweep).

## Pass criteria
- No mid-word cut unless the token is unbreakable — **PASS** (line-clamp breaks
  between words; `break-words` handles oversize tokens)
- Brand names remain intact — **PASS** (whole-word ellipsis; e.g. "Intel
  QSV-enabled FFmpeg…" never becomes "FFmp…"; stored titles untouched)
- Truncation visually clear, source metadata uncorrupted — **PASS** (ellipsis
  rendered by the clamp; DB titles & `title` tooltips carry full strings;
  tsc clean)
