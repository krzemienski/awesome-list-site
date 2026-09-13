# Task #554 loading-state correction

The previous loading evidence was rejected because it captured `App.tsx`'s route-level `div[data-testid="route-chunk-skeleton"]`, not the Search page's owned loading state. This correction replaces that claim with a real Search results transition.

## Method

- Chromium launched through `launchBrowserWithLease` with label `task-554-owned-search-loading` and `--disable-partial-raster`.
- Each viewport first warmed `/search?q=zzqxv-nothing` to the terminal `data-testid="text-no-results"` state after the lazy Search route had loaded.
- CDP `Network.emulateNetworkConditions` then applied 900 ms latency and 18 KiB/s download/upload throughput; cache was disabled with `Network.setCacheDisabled`. No response mocks or route interception were used.
- The input was filled with a new uncached `ffmpeg` query. Capture required `data-testid="search-results-loading"` with `.system-skeleton` descendants and required zero `data-testid="route-chunk-skeleton"` nodes.
- Replacement required `data-testid="search-results-grid"`, 24 cards, a result-count string, and visible `ffmpeg` content rather than an empty state.

## Owned capture results

| Width | Owned loading | `.system-skeleton` count | Route fallback count | Replacement | Content cards | Incremental CLS (excluding recent-input shifts) | Main height: skeleton → content |
| ---: | :---: | ---: | ---: | :---: | ---: | ---: | ---: |
| 375 | yes | 36 | 0 | yes | 24 | 0.0744419753 | +5361 px |
| 768 | yes | 36 | 0 | yes | 24 | 0.0819080247 | +2740 px |
| 1024 | yes | 36 | 0 | yes | 24 | 0.0900807608 | +5338 px |
| 1440 | yes | 36 | 0 | yes | 24 | 0.0835604102 | +2738 px |

The main region's height change is retained as measured geometry; this is evidence of replacement and is not claimed as a zero-shift pass. Per-width raw metrics, request/response records, DOM ownership checks, and screenshots are in `summary.json` and the numbered JSON/screenshot files.

## Focused axe

Focused full-page axe was captured while the owned Search skeleton was present at 375 and 1440. Serious/critical findings: **0** at both widths. The two remaining violations at each width are moderate landmark findings (`landmark-main-is-top-level`, `landmark-no-duplicate-main`); see `axe-summary.json` and `axe/loading@*.json`.

## Exact timed-out admin-fixture cleanup

The completion SEO failure supplied the exact run suffix `1789276853708_1a1xzr`. Parameterized development-DB checks targeted only the exact resource URL and exact empty-category name/slug. Both exact lookups were empty before cleanup; exact deletes returned `DELETE 0`; both exact lookups remained empty afterward. The persistent admin (`ds-button-sweep-admin+clerk_test@example.com`) remained untouched. No prefix query, broad cleanup, browser launch, or other-worker mutation was performed. Details are in `admin-fixture-cleanup.json`.
