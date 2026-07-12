# Run4 — Master Fix Prompt (July 12, 2026) — Findings Disposition

Audit source: `attached_assets/Pasted--Master-Fix-Prompt-awesome-video-Bug-Remediation-remedi_1783881727237.txt` (18 findings).
Triage baseline: the audit was captured **before** the July 10 republish, so many findings describe the pre-publish build.
All verification is live-system (Iron Rule): dev API via curl, dev DB via psql, browser via Playwright (`scripts/run4-verify-dev.mjs`).

| # | Finding | Disposition | Proof |
|---|---------|-------------|-------|
| BUG-009 | (pre-republish) | **STALE** — fixed by the July 10 merge/republish | Triage sweep (live prod), pre-dated republish |
| BUG-021 | (pre-republish) | **STALE** | Triage sweep |
| BUG-039 | `/api/resources` cursor param ignored | **FIXED** — `?cursor=` accepted as offset alias; response now carries `nextCursor` (mirrors `nextOffset`); invalid cursor → 400 | `curl "?cursor=5&limit=2"` → `offset 5, nextCursor 7, n 2`; `?cursor=abc` → 400 |
| BUG-100 | Share button silent | **STALE** — Share toasts on all paths in current build | Triage code + browser check |
| BUG-101 | (pre-republish) | **STALE** | Triage sweep |
| BUG-105 | (pre-republish) | **STALE** | Triage sweep |
| NEW-001 | (pre-republish) | **STALE** | Triage sweep |
| NEW-002 | No light mode toggle | **BY DESIGN — user decision pending** (site is intentionally dark-only per replit.md; asked user before building) | — |
| NEW-003 | No Reject control | **STALE** — Reject lives in PendingResources (the Approvals tab) | Browser: seeded a pending row → `rejectButtons=1`; cleaned up after |
| NEW-004 | No admin user deletion | **FIXED** — `DELETE /api/admin/users/:id` (self-delete guard, resources detached not deleted, edits removed, personal data cascades) + Users tab trash button w/ AlertDialog (hidden for self) | curl lifecycle: unauth 401, self 400, missing 404, delete → `{resourcesDetached:1}` / `{editsDeleted:1}`, user row gone, resource kept; browser: `rows=6 deleteButtons=5 confirmDialog=true` |
| NEW-005 | Journey descriptions are template boilerplate | **FIXED (dev)** — 5 unique real descriptions written to dev DB; new `PUT /api/admin/journeys/:id` added so the same fix can be applied to prod post-republish | psql update + browser: `5/5 snippets found, templateCopyPresent=false`; PUT round-trip 200, unauth 401, empty body 400, bad id 404 |
| NEW-006 | Pending/rejected resources publicly readable via `/api/resources/:id` | **FIXED** — non-approved → 404 unless admin (matches og-middleware soft-404) | curl: anon rejected id → 404, admin same id → 200, anon approved → 200 |
| NEW-007 | (pre-republish) | **STALE** | Triage sweep |
| NEW-011 | (pre-republish) | **STALE** | Triage sweep |
| NEW-012 | Submit form lacks subcategory selection | **STALE** — SubmitResource has dependent subcat/sub-sub dropdowns | Browser: comboboxes 1→2 after category pick |
| NEW-013 | "Edit in Admin" dumps on dashboard | **FIXED** — deep-links to `/admin/resources?resourceId=N`; ResourceManager fetches the resource, opens the edit dialog, strips the param | Browser: dialog title matches resource, `paramStripped=true` |
| NEW-014 | Feedback badge overlaps content | **NOT APP CODE** — zero `/feedback/i` matches in DOM; badge is Replit platform-injected on the dev preview | Browser DOM scan + `evidence/run4/new-014-bottom-right.png` |
| NEW-015 | Search dialog hides total match count | **FIXED** — "N matches — showing top 15" line above quick results (aria-live) | Browser: `"1015 matches — showing top 15"` for "codec" |

## Architect follow-ups (implemented same session)
- **BUG-004 closed**: `GET /api/resources?status=pending|rejected` now requires admin (403 otherwise) — previously anonymous callers could bulk-read exactly the bodies NEW-006 hides. Verified: anon pending/rejected → 403, admin rejected → 200 (total 168), anon approved/default/invalid → 200/200/400.
- **Related-endpoint leak closed**: `/api/resources/:id/related` returns the empty shape to non-admins for non-approved seed ids (a populated list confirmed hidden ids + leaked category). Verified: anon rejected id → empty, admin same id → populated, anon approved id → unchanged.

## Post-republish prod follow-ups — DONE (July 12, 2026)
- Republished; all fixes live on https://awesome.video.
- 5 journey descriptions applied via `PUT /api/admin/journeys/:id` (ids 6–10, titles matched dev exactly; all 200; public `/api/journeys` serves the new copy). Journal: `.local/prod-cleanup/prod-journey-descriptions-20260712.json`.
- 2 `__qa_test` users deleted via `DELETE /api/admin/users/:id` (both 200, `resourcesDetached:0`, `editsDeleted:0`; 0 remaining). Journal: `.local/prod-cleanup/prod-qa-users-deleted-20260712.json`.
- Live smoke: NEW-006 anon hidden id 188031 → 404, admin → 200; `/related` on hidden id → empty shape; BUG-004 anon `?status=pending` → 403; BUG-039 `?cursor=5` → offset 5 + `nextCursor` 7, `?cursor=abc` → 400.
- CSP check (July 10 merge risk): prod homepage loads with **0 CSP violations, 0 console errors**; `/category/encoding-codecs` renders "Showing 332 of 332 resources" with 24 cards on page 1.
- ~~NEW-002 light mode~~: **CLOSED — user decided July 12, 2026: keep dark-only (no change).** The pure-black cyberpunk theme is a deliberate design choice, not a defect.

## Session verification summary
- `tsc --noEmit` clean.
- Dev API: all new/changed endpoints exercised with auth, negative, and lifecycle cases (see table).
- Browser sweep: 8/8 checks PASS (`scripts/run4-verify-dev.mjs`, run in halves due to shell time budget), zero page errors.
- Search dialog debug `console.log` removed while touching the file.
