# ux-a11y — cycle 02 (rev c25cd76f, 16:57:05Z–17:38:19Z) — ISSUES 7 (2 MEDIUM, 5 LOW); PG-01..03 FIXED
(saved by lead from the auditor's final message; harness refused the auditor's Write). Evidence: evidence/eval-log.md + screenshots in this folder.

| id | sev | where | saw vs expected | likely source |
|---|---|---|---|---|
| PG-04 | Medium | category→category on Slow 3G, 1440 | focus lands on the OLD page's h1 while URL/title are new; ~2.2s later the same focused h1's text changes with no new focus event → SR names the wrong page. Expected: focus on the new page's h1 once rendered. | TaxonomyListing.tsx:243-249 keeps previous data while loading; nav-history.ts:184-194 accepts any visible h1 |
| PG-05 | Medium | offline on a category, then open another, 1440 | >25s the old category stays under the new URL/title, busy, focus on old h1; offline state never appears | same cause; query-availability.ts:18 never reports offline; TaxonomyListing.tsx:469 |
| OF-01 | Low | offline state then reconnect | focus falls to body (from Retry or the offline h1). Expected: loaded page's h1 | OfflinePageState.tsx:23-34 (handoff only when Retry clicked online) |
| PG-06 | Low | contact dialog | aria-describedby references nonexistent `…-form-item-description` before submit; half still unresolved after invalid submit | ui/form.tsx:116-119 always adds description id; contact-dialog.tsx has no FormDescription |
| PG-07 | Low | /submit, /journey/7 signed out | static sign-in notes are role="alert" (assertive), compete with h1 announcement after in-app nav; /submit note title is h5 right after h1 (skips levels) | ui/alert.tsx:28,39; SubmitResource.tsx:612-614; JourneyDetail.tsx:576 |
| PG-08 | Low | Back onto /tag/hls#related-topics-heading | scroll restored but focus on body; next Tab jumps to top "Back to Home" | nav-history.ts:169 skips any #fragment; TagLanding doesn't handle fragments |
| PG-09 | Low | /subcategory/*, /sub-subcategory/* | two breadcrumb landmarks with the same trail (sr-only "breadcrumb" + visible "Collection breadcrumb") | PageBreadcrumb.tsx:241; TaxonomyListing.tsx:642 |

## Cycle-1 re-checks: PG-01 FIXED (all nav kinds incl. Slow 3G cold routes; edge cases → PG-04/OF-01/PG-08); PG-02 FIXED; PG-03 FIXED.
## Passed: first load untouched; no ring on route focus; query-only changes keep own focus; /search input; skip link 156×44 wins; keyboard rings; offline state announced; contact dialog invalid flow; landmarks/headings/labels/alt/ids; reduced motion; contrast ≥4.5 (min 4.57) in 4 theme combos; Geist ring; targets at 820/390.
## UNVERIFIED: real SR; signed-in /settings#… fragments; contrast on 4 combos × 4 pages only; route focus at 820 not separately driven.
