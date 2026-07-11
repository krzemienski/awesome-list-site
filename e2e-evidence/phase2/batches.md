# Phase 2 batches

Seven logical batches; bugs within a batch are independent except where the
owning file is `server/routes.ts` / `server/index.ts` (`SERIAL-CONTROLLER-ONLY`).

| # | Batch | Bugs | Severity focus | Owner |
| - | --- | --- | --- | --- |
| 1 | **B-HDR** CSP/headers | 1, 36, 52-55 | HIGH | SERIAL → controller |
| 2 | **B-API** API surface | 5, 13, 15, 16, 17, 20, 22, 27, 39, 40, 76, 77, 78, 79, 92, 94 | CRITICAL+HIGH | SERIAL → controller |
| 3 | **B-AUTH** Auth-UX pages | 6, 29, 41, 42, 44, 79, 105 | HIGH | per-page (login shared with B-API for pre-fill) |
| 4 | **B-JOURNEY** Journey pages | 10, 28, 33, 34, 50, 75, 98 | MEDIUM | per-page |
| 5 | **B-CATEGORY** Category pages | 9, 11, 23, 32, 38, 45, 49 | MEDIUM | per-page |
| 6 | **B-RESOURCE** Resource detail | 8, 100, 101, 102, 103, 105 | HIGH+MEDIUM | per-page + share cmp |
| 7 | **B-OTHER** Misc pages (admin, sitemap, components, a11y, observations) | rest | MEDIUM+LOW | per-page or SERIAL |

Total: 103 active bugs (BUG-030, BUG-037 to be classified during reproduce pass).

The controller session will iterate batches in this order because the server-side
work (B-HDR, B-API) needs to land first so client pages can integrate.
