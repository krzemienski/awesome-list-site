# NB-021 — /api/search: total promised matches it never let you fetch
Fix: `offset` param (validated 0..PG_INT_MAX) passed to ResourceRepository.listResources (repo already supported offset); response now `{ query, total, limit, offset, nextOffset, results }`.
Live probes: q=video&limit=3 → total=1142, offset=0, nextOffset=3, ids [185034,186043,186428]; offset=3 → nextOffset=6, DIFFERENT ids [185830,185513,186025] (real pagination, not a resliced page). offset=abc → 400 {message}. Walk to completion: repeat offset=nextOffset until null. VERIFIED.
