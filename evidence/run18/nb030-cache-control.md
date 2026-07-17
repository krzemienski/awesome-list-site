# NB-030 — Cache-Control public split (app-side verification, dev :5000)

## Probes (July 17, 2026)
- `GET /api/awesome-list` → `Cache-Control: public, max-age=0, must-revalidate` + `ETag: "fa3dedd7..."`, NO Set-Cookie (session saveUninitialized:false)
- `GET /` (HTML) → `Cache-Control: no-store` (correct: nonce'd HTML must never be cached — see run17 nonce/304 lesson)
- Built assets: `server/index.ts` serveStatic sets `max-age=31536000, immutable` (prod path; L279-286)

## Verdict: app-side FIXED / platform-partial
The app emits the correct public split. The audit's "private" observation on prod
is the hosting edge (GAESA cookie coupling) rewriting cacheability — same class
as run16 BUG-092/run17 BUG-050. Journaled as platform-partial.
