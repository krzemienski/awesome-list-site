# VG-029 — Directory lists itself as a resource (BUG-029)

**Verdict: PASS** — July 20, 2026, live probes on dev after data pass

## Fix
Resource 184919 (`https://awesome.video/`, "Awesome Video", approved) rejected via
`PUT /api/resources/:id/reject` — the approved-state status path. Rule added to
`scripts/run22-data-fixes-prod.ts` (BUG-029 section), matched by URL host
`awesome.video` so it applies identically on prod. FK pre-check: 0 journey_steps,
0 user_bookmarks, 0 user_favorites, 0 resource_edits reference 184919 — status
change has no cascade surface at all.

Kept: resource 185077 (`https://github.com/krzemienski/awesome-video`) — the
upstream GitHub repository. That entry IS the externalized form of the list and
is a legitimate external resource.

## Live evidence
- Apply run: `{"finding":"BUG-029","id":184919,"url":"https://awesome.video/","action":"reject-self-entry","status":200}`
- Second run (idempotency): `{"finding":"BUG-029","id":184919,"action":"noop-already-non-approved","status":"rejected"}`
- `/api/awesome-list` scan after apply: self-entries in public list = 0;
  185077 still present; total public resources 1814 → 1813.
- `GET /api/resources/184919` → 404 (approved-only public read).
- `GET /resource/184919` (Googlebot UA) → 404 (og-middleware soft-404 path).
- Search cannot resurface it: client search operates on the /api/awesome-list
  corpus, which no longer contains the row.

## Pass criteria
- Directory no longer lists itself — **PASS** (0 matches in public corpus)
- Valid external resources remain — **PASS** (corpus 1813, upstream repo kept,
  only the one row status-changed; journal shows no other writes in this rule)
- Does not reappear after reload/cache refresh — **PASS** (status is persisted
  in the DB; the awesome-list server cache rebuilds from the DB and the fresh
  read above already reflects the removal)

## Prod follow-up (after republish)
Same script run against prod rejects prod's 184919 via the identical code path.
