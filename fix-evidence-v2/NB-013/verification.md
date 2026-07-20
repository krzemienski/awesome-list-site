# NB-013 — four duplicate resource pairs merged to canonical entries

## Fix
`scripts/run23-data-fixes-prod.ts` (idempotent, admin-API; dev-validated via
the same code path, prod run journaled for post-republish). Twins removed via
`PUT /api/resources/:id/reject` (approved-state path — public page/API 404,
catalog counts adjust), survivors updated via `PUT /api/admin/resources/:id`.

| Pair | Canonical survivor | Update | Rejected twin(s) |
|---|---|---|---|
| RFC 2326 (RTSP spec) | 185467 | url → datatracker.ietf.org/doc/html/rfc2326 | 185517 (tools.ietf.org mirror) |
| BOLA paper | 186095 | url → arxiv.org/abs/1601.06748 | 187937 (prod-only; absent in dev → noop) |
| Shaka Player Embedded | 185259 (shaka-project org URL) | subcategory → Embedded Players (adopted from twin) | 186140 (google/ redirect URL) |
| rtsp-simple-server | **184829 "MediaMTX"** (pre-existing canonical successor at bluenviron/mediamtx) | subcategory → Streaming Servers | 186611 (aler9 pre-rename URL) + 185324 (xiejiulong fork) |

All 4 canonical URLs live-probed 200 before the merge (datatracker, arXiv abs,
shaka-project, bluenviron).

## Live proof (dev, July 20, 2026)
- First run: 9 actions, all HTTP 200 (`data-fixes-dev.json` in this dir).
- Second run: all no-ops (`survivor-noop` / `twin-already-non-approved`) —
  idempotency proven.
- Public probes after merge:
  - twins `185517 186140 186611 185324` → `/api/public/resources/:id` all **404**
  - survivors return canonical data (185467 with datatracker URL, 186095 with
    arXiv abs URL, 185259 unchanged shaka-project URL, 184829 bluenviron URL).

## Prod follow-up
Run after republish: `ADMIN_PASSWORD=... npx tsx scripts/run23-data-fixes-prod.ts`
(also applies NB-014; prod additionally has twin 187937 which dev lacks).
