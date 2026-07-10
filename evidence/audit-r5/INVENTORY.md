# Full Functional Audit r5 — Inventory (Phase 1)

Date: July 10, 2026. Base: `evidence/audit-r4/INVENTORY.md` (unchanged frontend: 19 routes + 9 redirects + 404).

## Drift since r4 (July 9–10 changes, all covered in Sweep A)
| Change | New surface | r5 coverage |
|---|---|---|
| `GET /api/health/ai` implemented (was docs-drift) | cheap mode + `?deep=1` real round-trip | sweepA `health-ai`, `health-ai-deep` |
| Suggested-paths in-memory cache + boot warm-up | cold-start <40ms post-warm-up | sweepA `learning-paths-suggested` timing |
| Learning-path param hardening | limit clamp [1,10], skillLevel/timeCommitment whitelist, categories validated vs DB, goals cap | sweepA `lp-limit-clamp-*`, `lp-bogus-skill`, `lp-fake-category` |
| AI path generation fixed (4k tokens, brace extraction) | `generationType:'ai'` on suggested paths | sweepA `lp-generation-type` |

## Backend route counts (registered handlers)
- `server/routes.ts`: 126 registered method handlers; `server/api/public.ts`: 5.
- Corrected canonical paths vs r4 notes: API keys live at `/api/user/api-keys`; GitHub sync at `/api/github/sync-status` / `/api/github/sync-history`; recommendations init is `GET /api/recommendations/init`; OG images at `/og-image.svg|png` (no `/api` prefix).

## Baseline (pre-sweep, `baseline.json`)
approved=1,838 · total=1,994 · users=6 · categories=9 · journeys=5 · `__qa_test` residue=0.
Per-category: Community 81 · Encoding 325 · General 151 · Infra 199 · Intro 194 · Media 255 · Players 234 · Protocols 200 · Standards 199 (matches r4 exactly).

## Deliberately skipped (destructive/expensive) — auth gates verified instead
Real AI enrichment/researcher runs, GitHub import/export POSTs, bulk delete/approve on real data (same as r4).
