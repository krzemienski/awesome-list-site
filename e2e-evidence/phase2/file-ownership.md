# Phase 2 file-ownership map

**Run:** 2026-07-11
**Bugs covered:** 103 (BUG-001 .. BUG-106, with 4 unclassified)
**Hot files (single-writer, controller session only):** `server/routes.ts`, `server/index.ts`

## Disjoint batch plan

Each batch must NOT share files in its ownership set with any other batch classified `parallel-eligible`.

| Batch | Bug IDs | Owning files | Parallel? |
| --- | --- | --- | --- |
| **B-HDR** (CSP/headers)  | 1, 36, 52, 53, 54, 55 | `server/index.ts` | **SERIAL** |
| **B-COOKIE**             | 72, 105              | `server/index.ts` (or `server/middleware/session.ts`) | **SERIAL** |
| **B-AUTH-API**          | 5, 15, 16, 17, 27, 40, 41, 76, 77, 78, 92, 94 | `server/routes.ts`, `server/localAuth.ts` (login), `client/src/pages/Login.tsx` (pre-fill) | **SERIAL** |
| **B-API-READ**          | 13, 15, 20, 22, 39, 76, 79 | `server/routes.ts` | **SERIAL** |
| **B-WRITE/PROFILE**     | 27, 40, 92, 94       | `server/routes.ts` | **SERIAL** |
| **B-SITEMAP**           | 21, 32, 45, 46, 49, 51, 81, 89 + sitemap cluster | `server/sitemap*.ts`, `server/seo-content.ts` | conditional SERIAL (shared with B-HDR if headers/middleware collide) |
| **B-SEO-META**          | 13, 19, 31, 36, 75, 101, 102, 103 | `server/seo-content.ts`, `server/og-middleware.ts`, `client/src/pages/*` render | per-page splits OK |
| **B-PAGE-LOGIN**        | 6, 29, 41, 42, 44, 79 | `client/src/pages/{Login,Register,ForgotPassword,ResetPassword}.tsx` | per-page |
| **B-PAGE-JOURNEYS**    | 10, 28, 33, 34, 50, 75, 98 | `client/src/pages/{Journeys,JourneyDetail}.tsx` | per-page |
| **B-PAGE-CATEGORIES**  | 11, 23, 32, 38, 45, 49 | `client/src/pages/{Categories,Category,Subcategory,SubSubcategory}.tsx` | per-page |
| **B-PAGE-OTHER**       | 9, 24, 25, 27, 35 | `client/src/pages/{Home,About,Recommendations,Bookmarks}.tsx` | per-page |
| **B-PAGE-RESOURCE**    | 13, 100, 101, 102, 103, 105 (detail render) | `client/src/pages/ResourceDetail.tsx`, `client/src/components/resource/*` | per-page + share cmp |
| **B-PAGE-ADMIN**       | 66, 67, 74, 80, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99 | `client/src/pages/AdminDashboard.tsx`, `client/src/components/admin/*` | SERIAL (admin owns large component) |
| **B-COMPONENTS**       | 7, 35, 97, 104      | `client/src/components/layout/*` | per-component |
| **B-COMP-SHARE**       | 100                | `client/src/components/resource/ShareButton.tsx` | single bug |
| **B-A11Y/CONTRAST**    | 7, 18, 97, 104     | `client/src/components/layout/*`, theme tokens | per-component |
| **B-CORRECTNESS**      | 8, 12, 14, 22, 33, 38, 65, 70, 83, 105 (count delta) | mixed; mostly per-page | per-page |
| **B-OBSERVATIONS**     | 95 (curation bias)  | none (WONTFIX) | — |

## How sub-agents use this map

- A parallel-eligible batch may be worked concurrently by multiple sub-agents, each holding one disjoint page or component.
- Any batch whose owning set includes `server/routes.ts` or `server/index.ts` is `SERIAL-CONTROLLER-ONLY`. The controller edits it. Sub-agents cannot.
- For each bug, the sub-agent writes `e2e-evidence/bugs/BUG-NNN/{repro.txt,before.png?,after.txt,after.png?,fix.md|REFUSAL.md}` and reports its terminal status back to the controller.
- BUGs 30, 37 are **retracted** in REPORT.md; the prompt keeps them tracked but they need only an `ALREADY-FIXED` probe to confirm.

## Unclassified (needs hand-classification)

- BUG-014 (no file hint — needs symptom read)
- BUG-65, BUG-70, BUG-83 (no file hint — needs symptom read)

These will be classified during the per-bug probe step below.
