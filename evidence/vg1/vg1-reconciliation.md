# VG-1 Evidence — awesome.video local remediation
env: local PG16 branch (postgresql://localhost:5433/awesome_local, restored read-only from Neon, 1954 rows)
app: PORT=5050 NODE_ENV=development tsx server/index.ts
commit: 3f735a1b  branch: fix/bughunt-remediation-v2
timestamp: 2026-07-11T19:08:20Z

## BUG-015 search q= (CRITICAL) — FIXED
### expected: q=ffmpeg returns ffmpeg matches; q=zznomatchzz returns 0; data changes with query
$ curl /api/resources?q=ffmpeg&limit=3
{"total":205,"titles":["PyAV","FFV1 Codec","vid.stab"]}
$ curl /api/resources?q=zznomatchzz
{"total":0}
$ curl /api/resources?search=ffmpeg (baseline, unchanged)
{"total":205}

## BUG-016/040 anon POST /api/resources (CRITICAL bypass) — already fixed
$ curl -X POST /api/resources (anon)
{"message":"Unauthorized"} [http=401]

## Root cause: DB schema drift — search_tsv column
shared/schema.ts:234 declares generated searchTsv column citing migrations/0029_search_fts.sql;
column was ABSENT from live DB -> every /api/resources SELECT 500'd (PG 42703 column "search_tsv" does not exist).
migrate.ts runs only when NODE_ENV=production (index.ts:128); Neon was provisioned via db:push, so 0029 never applied.
Fix on validation branch: applied migrations/0029_search_fts.sql (idempotent ADD COLUMN IF NOT EXISTS + GIN index).

## /api/auth/* surface (BUG-005) — still 404 (open)
404  /api/auth/status
404  /api/auth/login
